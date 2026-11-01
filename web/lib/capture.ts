// The silent witness. Records audio and video in 5-second pieces plus location fixes; each piece is
// fingerprinted (SHA-256 of the plaintext), encrypted on the phone, written to the local outbox and
// uploaded straight away. If the phone is snatched, at most the piece being recorded is lost.
//
// In the Android app (lib/native.ts), a foreground service keeps all of this running with the screen
// locked; in a browser, recording keeps the screen on instead.
//
// Phones take the camera away (a call, another app, the OS). When a track ends or the recorder goes
// quiet, recording restarts with a fresh stream as a new *segment*: each segment is its own playable
// file, because a new recorder writes a new file header.
import { encryptPiece, openSessionForWriting, sha256Hex } from "./crypto";
import { enqueue, putSession, type DeviceSetup, type LocalSession, type OutboxItem } from "./local";
import { holdWhileLocked, releaseHold } from "./native";
import { drain } from "./sync";

export const PIECE_MS = 5000;
const LOCATION_EVERY_MS = 10_000;
const STALL_MS = PIECE_MS * 2.5;

export type CaptureMode = "video" | "audio" | "location-only";

export interface CaptureStatus {
  sessionId: string;
  startedAt: number;
  mode: CaptureMode;
  pieces: number; // media pieces and location fixes captured so far
  located: boolean;
  lastFix: GeolocationCoordinates | null;
}

const VIDEO_TYPES = ["video/webm;codecs=vp8,opus", "video/webm", "video/mp4"];
const AUDIO_TYPES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];

function pickType(candidates: string[]): string | undefined {
  return candidates.find((t) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(t));
}

async function openStream(): Promise<{ stream: MediaStream | null; mode: CaptureMode }> {
  const md = navigator.mediaDevices;
  if (!md?.getUserMedia) return { stream: null, mode: "location-only" };
  try {
    const stream = await md.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: true },
      video: { facingMode: "environment", width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 15 } },
    });
    return { stream, mode: "video" };
  } catch {
    try {
      return { stream: await md.getUserMedia({ audio: true }), mode: "audio" };
    } catch {
      return { stream: null, mode: "location-only" };
    }
  }
}

export class Capture {
  status: CaptureStatus;
  private session: LocalSession;
  private key: CryptoKey | null = null;
  private stream: MediaStream | null = null;
  private recorder: MediaRecorder | null = null;
  private segment = -1;
  private lastDataAt = 0;
  private watchdog: number | undefined;
  private restarting: Promise<void> | null = null;
  private watchId: number | null = null;
  private wakeLock: WakeLockSentinel | null = null;
  private held = false; // the Android app is keeping us alive, so the screen may lock
  private lastFixAt = 0;
  private seq = { media: 0, location: 0 };
  private chain: Promise<void> = Promise.resolve();
  private stopped = false;

  private constructor(
    private setup: DeviceSetup,
    private onChange: (s: CaptureStatus) => void,
  ) {
    const id = crypto.randomUUID();
    this.status = { sessionId: id, startedAt: Date.now(), mode: "location-only", pieces: 0, located: false, lastFix: null };
    this.session = {
      id,
      kind: "sos",
      status: "active",
      duress: false,
      ephemeralPublicKey: "",
      mime: null,
      title: null,
      startedAt: new Date().toISOString(),
      endedAt: null,
      dirty: true,
    };
  }

  /** Starts recording immediately. Needs only her public key, so it works from the locked calculator. */
  static async start(setup: DeviceSetup, onChange: (s: CaptureStatus) => void): Promise<Capture> {
    const c = new Capture(setup, onChange);
    await c.begin();
    return c;
  }

  get sessionId() {
    return this.session.id;
  }

  private emit() {
    this.onChange({ ...this.status });
  }

  private async begin() {
    // In the Android app the service starts first: it asks for any permission still missing, so the
    // camera then opens without a second prompt.
    const [{ key, ephemeralPublicKey }] = await Promise.all([
      openSessionForWriting(this.setup.publicKey, this.session.id),
      holdWhileLocked().then((held) => {
        this.held = held;
        return this.startRecorder();
      }),
    ]);
    this.key = key;
    this.session.ephemeralPublicKey = ephemeralPublicKey;
    await putSession(this.session);
    void drain();

    this.watchdog = window.setInterval(() => {
      if (this.recorder && Date.now() - this.lastDataAt > STALL_MS) void this.restart();
    }, PIECE_MS);

    if ("geolocation" in navigator) {
      this.watchId = navigator.geolocation.watchPosition(
        (pos) => this.onFix(pos),
        () => {},
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 20_000 },
      );
    }
    if (!this.held) {
      await this.holdScreen();
      document.addEventListener("visibilitychange", this.onVisibility);
    }
    this.emit();
  }

  /** Opens the camera (or just the microphone) and starts a new segment. */
  private async startRecorder() {
    const { stream, mode } = await openStream();
    if (this.stopped) {
      stream?.getTracks().forEach((t) => t.stop());
      return;
    }
    this.stream = stream;
    this.status.mode = mode;
    if (!stream) {
      this.recorder = null;
      return;
    }
    const mimeType = pickType(mode === "video" ? VIDEO_TYPES : AUDIO_TYPES);
    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 500_000, audioBitsPerSecond: 48_000 });
    const segment = ++this.segment;
    this.session.mime ??= recorder.mimeType || mimeType || null;
    recorder.ondataavailable = (e) => {
      this.lastDataAt = Date.now();
      if (e.data.size > 0) this.queue("media", e.data, segment);
    };
    recorder.onerror = () => void this.restart();
    stream.getTracks().forEach((t) => t.addEventListener("ended", () => void this.restart(), { once: true }));
    this.recorder = recorder;
    this.lastDataAt = Date.now();
    recorder.start(PIECE_MS);
  }

  /** Finishes the current segment (keeping whatever it recorded) and starts a fresh one. */
  private restart(): Promise<void> {
    if (this.stopped) return Promise.resolve();
    this.restarting ??= (async () => {
      await this.closeRecorder();
      await this.startRecorder();
      this.emit();
    })().finally(() => (this.restarting = null));
    return this.restarting;
  }

  private async closeRecorder() {
    const r = this.recorder;
    this.recorder = null;
    if (r && r.state !== "inactive") {
      // A recorder whose tracks died may never fire "stop"; don't wait for it forever.
      const done = new Promise<void>((resolve) => {
        r.addEventListener("stop", () => resolve(), { once: true });
        window.setTimeout(resolve, 1500);
      });
      try {
        r.stop();
      } catch {
        // Already stopped.
      }
      await done;
    }
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
  }

  private onVisibility = () => {
    if (document.visibilityState === "visible" && !this.stopped) void this.holdScreen();
  };

  /** A web app can't record reliably once the phone locks, so keep the screen on (and dark). */
  private async holdScreen() {
    try {
      if ("wakeLock" in navigator && !this.wakeLock) {
        this.wakeLock = await navigator.wakeLock.request("screen");
        this.wakeLock.addEventListener("release", () => (this.wakeLock = null));
      }
    } catch {
      // Battery saver or an unsupported browser: recording still continues while the screen is on.
    }
  }

  private onFix(pos: GeolocationPosition) {
    this.status.located = true;
    this.status.lastFix = pos.coords;
    const now = Date.now();
    if (now - this.lastFixAt >= LOCATION_EVERY_MS) {
      this.lastFixAt = now;
      const fix = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: Math.round(pos.coords.accuracy),
        at: new Date(pos.timestamp).toISOString(),
      };
      this.queue("location", new Blob([JSON.stringify(fix)], { type: "application/json" }), 0);
    }
    this.emit();
  }

  /** Pieces are processed in order, one after another, so sequence numbers match capture order. */
  private queue(kind: "media" | "location", blob: Blob, segment: number) {
    const seq = this.seq[kind]++;
    const capturedAt = new Date().toISOString();
    this.chain = this.chain.then(async () => {
      // The session key is derived in parallel with opening the camera; the first piece can beat it.
      while (!this.key) await new Promise((r) => setTimeout(r, 50));
      const plain = await blob.arrayBuffer();
      const [sha256, cipher] = await Promise.all([sha256Hex(plain), encryptPiece(this.key, plain)]);
      const prefix = kind === "media" ? "m" : "l";
      const item: OutboxItem = {
        id: `${this.session.id}:${kind}:${seq}`,
        sessionId: this.session.id,
        kind,
        seq,
        segment,
        sha256,
        size: plain.byteLength,
        storagePath: `${this.setup.userId}/${this.session.id}/${prefix}-${String(seq).padStart(5, "0")}.bin`,
        capturedAt,
        body: new Blob([cipher]),
        attempts: 0,
      };
      await enqueue(item);
      this.status.pieces++;
      this.emit();
      void drain();
    });
  }

  /** The duress PIN: everything looks stopped, but recording carries on and the session is flagged. */
  async markDuress() {
    this.session = { ...this.session, duress: true, dirty: true };
    await putSession(this.session);
    void drain();
  }

  /** Stops recording and waits for the last piece to be saved locally. */
  async stop(status: "ended" | "undone" = "ended") {
    if (this.stopped) return;
    this.stopped = true;
    window.clearInterval(this.watchdog);
    document.removeEventListener("visibilitychange", this.onVisibility);
    await this.restarting;
    await this.closeRecorder();
    if (this.watchId !== null) navigator.geolocation.clearWatch(this.watchId);
    await this.wakeLock?.release().catch(() => {});
    await this.chain;
    if (this.held) await releaseHold();
    this.session = { ...this.session, status, endedAt: new Date().toISOString(), dirty: true };
    await putSession(this.session);
    void drain();
  }
}
