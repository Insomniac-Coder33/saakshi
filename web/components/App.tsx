"use client";

// The whole phone app lives on one URL, so the address bar and history never give the disguise away.
//   calculator ──PIN + =──▶ vault
//   calculator ──3 taps──▶ SOS ──hold──▶ calculator (still recording) ──PIN + =──▶ stopped, vault
//                                                                   └─duress PIN──▶ looks stopped, keeps recording
import { useCallback, useEffect, useRef, useState } from "react";
import { Capture, type CaptureStatus } from "@/lib/capture";
import { listGuardians, sendAlert } from "@/lib/guardians";
import { clearDevice, getSetup, outbox, type DeviceSetup } from "@/lib/local";
import { endInterruptedSessions } from "@/lib/recordings";
import { checkPin, createSetup } from "@/lib/setup";
import { DEMO_DURESS_PIN, DEMO_PIN } from "@/lib/site";
import { onSynced, startBackgroundSync } from "@/lib/sync";
import { Calculator } from "./Calculator";
import { Onboarding } from "./Onboarding";
import { Sos } from "./Sos";
import { Vault } from "./Vault";

type Phase = "loading" | "onboarding" | "calculator" | "vault" | "sos";

const UNDO_SECONDS = 10;
const LOCATION_EVERY_MS = 30_000;

// Guardian alerts for the running SOS: due once the undo window passes (at once after a duress PIN),
// retried until the server has them, then her location every 30 seconds.
interface AlertState {
  sessionId: string;
  due: number;
  started: boolean;
  duressPending: boolean;
  lastFixAt: number;
  busy: boolean;
}

export function App() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [setup, setSetup] = useState<DeviceSetup | null>(null);
  const [privateKey, setPrivateKey] = useState<CryptoKey | null>(null);
  const [status, setStatus] = useState<CaptureStatus | null>(null);
  const [pending, setPending] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const [guardianName, setGuardianName] = useState<string | null>(null);
  const capture = useRef<Capture | null>(null);
  const starting = useRef(false);
  const alert = useRef<AlertState | null>(null);
  const latest = useRef<CaptureStatus | null>(null);
  useEffect(() => {
    latest.current = status;
  }, [status]);

  useEffect(() => {
    getSetup().then(async (s) => {
      // The showcase site's live demo opens "/?demo": a fresh device skips onboarding with demo PINs.
      if (!s && new URLSearchParams(location.search).has("demo")) {
        s = await createSetup({ name: "", language: "en", ageGroup: "adult", pin: DEMO_PIN, duressPin: DEMO_DURESS_PIN }).catch(() => undefined);
      }
      setSetup(s ?? null);
      setPhase(s ? "calculator" : "onboarding");
    });
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (!setup) return;
    return startBackgroundSync();
  }, [setup]);

  // Who the SOS screen says can see her, refreshed whenever an SOS opens.
  useEffect(() => {
    if (!setup || phase !== "sos") return;
    listGuardians().then((gs) => setGuardianName(gs.find((g) => g.linkedAt)?.name ?? null), () => {});
  }, [setup, phase]);

  // Leaving the app while the vault is open locks it.
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden" && phase === "vault") {
        setPrivateKey(null);
        setPhase("calculator");
      }
    };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, [phase]);

  // How many of this session's pieces are still waiting to upload.
  const sessionId = status?.sessionId;
  useEffect(() => {
    if (!sessionId) return;
    const count = () => outbox().then((items) => setPending(items.filter((i) => i.sessionId === sessionId).length));
    count();
    return onSynced(count);
  }, [sessionId, status?.pieces]);

  useEffect(() => {
    if (!sessionId) return;
    const tick = async () => {
      const a = alert.current;
      if (!a || a.sessionId !== sessionId || a.busy || Date.now() < a.due) return;
      const c = latest.current?.lastFix;
      const fix = c ? { lat: c.latitude, lng: c.longitude, accuracy: Math.round(c.accuracy) } : null;
      a.busy = true;
      try {
        if (!a.started) {
          if (await sendAlert(a.duressPending ? "duress" : "start", sessionId, fix)) {
            a.started = true;
            a.duressPending = false;
            if (fix) a.lastFixAt = Date.now();
          }
        } else if (a.duressPending) {
          if (await sendAlert("duress", sessionId, fix)) a.duressPending = false;
        } else if (fix && Date.now() - a.lastFixAt >= LOCATION_EVERY_MS) {
          if (await sendAlert("location", sessionId, fix)) a.lastFixAt = Date.now();
        }
      } finally {
        a.busy = false;
      }
    };
    const id = window.setInterval(() => void tick(), 3000);
    return () => window.clearInterval(id);
  }, [sessionId]);

  // Ten seconds to undo before guardians hear anything.
  useEffect(() => {
    if (countdown <= 0) return;
    const id = window.setTimeout(() => setCountdown((n) => n - 1), 1000);
    return () => window.clearTimeout(id);
  }, [countdown]);

  const startSos = useCallback(
    async (opts: { silent?: boolean; duress?: boolean } = {}) => {
      if (!setup) return;
      if (capture.current || starting.current) {
        if (!opts.silent) setPhase("sos");
        return;
      }
      starting.current = true;
      navigator.vibrate?.(20);
      if (!opts.silent) setPhase("sos");
      try {
        const c = await Capture.start(setup, setStatus);
        capture.current = c;
        setStatus({ ...c.status });
        alert.current = {
          sessionId: c.sessionId,
          due: Date.now() + (opts.duress ? 0 : UNDO_SECONDS * 1000),
          started: false,
          duressPending: !!opts.duress,
          lastFixAt: 0,
          busy: false,
        };
        if (opts.duress) {
          await c.markDuress();
        } else {
          setCountdown(UNDO_SECONDS);
        }
      } catch (e) {
        console.error("[sos] could not start", e);
        if (!opts.silent) setPhase("calculator");
      } finally {
        starting.current = false;
      }
    },
    [setup],
  );

  const stopCapture = useCallback(async (how: "ended" | "undone") => {
    const c = capture.current;
    capture.current = null;
    const a = alert.current;
    alert.current = null;
    if (a?.started && how === "ended") void sendAlert("end", a.sessionId);
    setCountdown(0);
    await c?.stop(how);
    setStatus(null);
    setPending(0);
  }, []);

  const onPin = useCallback(
    async (pin: string) => {
      if (!setup) return false;
      const result = await checkPin(setup, pin);
      if (result.kind === "vault") {
        if (capture.current) await stopCapture("ended");
        void endInterruptedSessions();
        setPrivateKey(result.privateKey);
        setPhase("vault");
        return true;
      }
      if (result.kind === "duress") {
        // Looks like an ordinary sum on the calculator. Underneath, recording continues (or starts).
        if (capture.current) {
          await capture.current.markDuress();
          if (alert.current) {
            alert.current.duressPending = true;
            alert.current.due = Math.min(alert.current.due, Date.now());
          }
        } else void startSos({ silent: true, duress: true });
      }
      return false;
    },
    [setup, startSos, stopCapture],
  );

  if (phase === "loading") return <main className="h-dvh bg-calc" />;

  if (phase === "onboarding" || !setup)
    return (
      <Onboarding
        onDone={(s) => {
          setSetup(s);
          setPhase("calculator");
        }}
      />
    );

  if (phase === "sos")
    return status ? (
      <Sos
        lang={setup.language}
        status={status}
        pending={pending}
        countdown={countdown}
        guardianName={guardianName}
        onUndo={() => {
          void stopCapture("undone");
          setPhase("calculator");
        }}
        onHoldStop={() => setPhase("calculator")}
      />
    ) : (
      <main className="h-dvh bg-plum-night" />
    );

  if (phase === "vault" && privateKey)
    return (
      <Vault
        setup={setup}
        privateKey={privateKey}
        recording={status !== null}
        onLock={() => {
          setPrivateKey(null);
          setPhase("calculator");
        }}
        onStartSos={() => void startSos()}
        onStopCapture={() => void stopCapture("ended")}
        onSetupChange={setSetup}
        onErased={async () => {
          // The account is gone; stop recording before this phone is wiped, so nothing is written back.
          await stopCapture("undone");
          await clearDevice();
          setPrivateKey(null);
          setSetup(null);
          setPhase("onboarding");
        }}
      />
    );

  return <Calculator onPin={onPin} onTripleTap={() => void startSos()} />;
}
