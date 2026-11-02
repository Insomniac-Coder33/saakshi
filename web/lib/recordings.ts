// Reading her recordings back: merges what's on the server with what's still in the local outbox,
// and decrypts on the phone with her unlocked private key.
import { decryptPiece, openSessionForReading, sha256Hex } from "./crypto";
import { getSession, localSessions, outbox, putSession, type LocalSession } from "./local";
import { EVIDENCE_BUCKET, supabase } from "./supabase";
import { drain } from "./sync";

export interface PieceInfo {
  kind: "media" | "location" | "text" | "image";
  seq: number;
  segment: number;
  sha256: string;
  size: number;
  storagePath: string;
  capturedAt: string;
  receivedAt: string | null; // the server's clock, once uploaded
  local: Blob | null; // ciphertext still waiting in the outbox
  seal: SealInfo | null;
}

export interface SealInfo {
  confirmed: boolean; // false while the transaction is still on its way
  tx: string | null;
  at: string | null; // the block's timestamp once confirmed
  root: string | null;
  block: number | null;
}

interface SealRow {
  status: string;
  tx_hash: string | null;
  anchored_at: string | null;
  root?: string;
  block_number?: number | null;
}

// A seal still being built has no transaction yet, so it doesn't count.
function sealOf(row: SealRow | null): SealInfo | null {
  if (!row || (row.status !== "sent" && row.status !== "confirmed")) return null;
  return { confirmed: row.status === "confirmed", tx: row.tx_hash, at: row.anchored_at, root: row.root ?? null, block: row.block_number ?? null };
}

export interface RecordingSummary {
  session: LocalSession;
  pieces: number;
  pending: number;
  sealed: number;
}

/** Her recordings, newest first. Works offline from the local copy. */
export async function listRecordings(): Promise<RecordingSummary[]> {
  const [sessions, queued] = await Promise.all([localSessions(), outbox()]);
  const counts = new Map<string, number>();
  const sealed = new Map<string, number>();
  try {
    const { data } = await supabase().from("pieces").select("session_id, seals(status, tx_hash, anchored_at)").overrideTypes<{ session_id: string; seals: SealRow | null }[]>();
    for (const row of data ?? []) {
      counts.set(row.session_id, (counts.get(row.session_id) ?? 0) + 1);
      if (sealOf(row.seals)) sealed.set(row.session_id, (sealed.get(row.session_id) ?? 0) + 1);
    }
  } catch {
    // Offline: show local counts only.
  }
  return sessions
    .filter((s) => s.kind === "sos" && s.status !== "undone")
    .map((s) => {
      const pending = queued.filter((q) => q.sessionId === s.id).length;
      return { session: s, pieces: (counts.get(s.id) ?? 0) + pending, pending, sealed: sealed.get(s.id) ?? 0 };
    })
    .sort((a, b) => b.session.startedAt.localeCompare(a.session.startedAt));
}

export async function listPieces(sessionId: string): Promise<PieceInfo[]> {
  const queued = (await outbox()).filter((q) => q.sessionId === sessionId);
  const { data, error } = await supabase()
    .from("pieces")
    .select("kind, seq, segment, sha256, size, storage_path, captured_at, received_at, seals(status, tx_hash, anchored_at, root, block_number)")
    .eq("session_id", sessionId)
    .overrideTypes<{ kind: PieceInfo["kind"]; seq: number; segment: number; sha256: string; size: number; storage_path: string; captured_at: string; received_at: string; seals: SealRow | null }[]>();
  const remote: PieceInfo[] = error
    ? []
    : (data ?? []).map((r) => ({
        kind: r.kind,
        seq: r.seq,
        segment: r.segment,
        sha256: r.sha256,
        size: r.size,
        storagePath: r.storage_path,
        capturedAt: r.captured_at,
        receivedAt: r.received_at,
        local: null,
        seal: sealOf(r.seals),
      }));
  const seen = new Set(remote.map((p) => `${p.kind}:${p.seq}`));
  for (const q of queued) {
    if (seen.has(`${q.kind}:${q.seq}`)) continue;
    remote.push({
      kind: q.kind,
      seq: q.seq,
      segment: q.segment,
      sha256: q.sha256,
      size: q.size,
      storagePath: q.storagePath,
      capturedAt: q.capturedAt,
      receivedAt: null,
      local: q.body,
      seal: null,
    });
  }
  return remote.sort((a, b) => (a.kind === b.kind ? a.seq - b.seq : a.kind.localeCompare(b.kind)));
}

async function cipherOf(p: PieceInfo): Promise<Uint8Array<ArrayBuffer>> {
  if (p.local) return new Uint8Array(await p.local.arrayBuffer());
  const { data, error } = await supabase().storage.from(EVIDENCE_BUCKET).download(p.storagePath);
  if (error || !data) throw error ?? new Error("download failed");
  return new Uint8Array(await data.arrayBuffer());
}

export interface Decrypted {
  media: Blob[]; // one playable file per segment, in order
  locations: { lat: number; lng: number; accuracy: number; at: string }[];
}

/** Decrypts a whole recording on the phone. Each segment's pieces join back into one playable file. */
export async function decryptRecording(
  session: LocalSession,
  pieces: PieceInfo[],
  privateKey: CryptoKey,
): Promise<Decrypted> {
  const key = await openSessionForReading(privateKey, session.ephemeralPublicKey, session.id);
  const plain = await Promise.all(pieces.map(async (p) => ({ p, bytes: await decryptPiece(key, await cipherOf(p)) })));
  const segments = new Map<number, ArrayBuffer[]>();
  for (const x of plain.filter((x) => x.p.kind === "media")) {
    segments.set(x.p.segment, [...(segments.get(x.p.segment) ?? []), x.bytes]);
  }
  const decoder = new TextDecoder();
  const locations = plain
    .filter((x) => x.p.kind === "location")
    .map((x) => JSON.parse(decoder.decode(x.bytes)) as Decrypted["locations"][number]);
  return {
    media: [...segments.keys()]
      .sort((a, b) => a - b)
      .map((k) => new Blob(segments.get(k)!, { type: session.mime ?? "video/webm" })),
    locations,
  };
}

/** How many of this session's pieces are sealed, for the SOS screen's "6 sealed". */
export async function sealedCount(sessionId: string): Promise<number> {
  const { count } = await supabase()
    .from("pieces")
    .select("id", { count: "exact", head: true })
    .eq("session_id", sessionId)
    .not("seal_id", "is", null);
  return count ?? 0;
}

/**
 * Registers one segment's file, exactly as she downloads it, so the Verify page can find it by its
 * fingerprint and split it back into sealed pieces. Only once every piece in it is on the server.
 */
export async function registerFile(sessionId: string, segment: number, file: Blob, pieces: PieceInfo[]): Promise<string> {
  const sha256 = await sha256Hex(await file.arrayBuffer());
  const inSegment = pieces.filter((p) => p.kind === "media" && p.segment === segment);
  if (inSegment.length && inSegment.every((p) => !p.local)) {
    await supabase()
      .from("files")
      .upsert(
        { session_id: sessionId, segment, sha256, size: file.size, piece_count: inSegment.length },
        { onConflict: "session_id,segment" },
      );
  }
  return sha256;
}

/**
 * An SOS whose page was closed or reloaded mid-recording stays "active", and its guardians are told
 * her phone went quiet. Only her own PIN ends it: whoever reopens the calculator could be him.
 */
export async function endInterruptedSessions(): Promise<void> {
  const stale = (await localSessions()).filter((s) => s.kind === "sos" && s.status === "active");
  if (!stale.length) return;
  const queued = await outbox();
  for (const s of stale) {
    const last = queued.filter((q) => q.sessionId === s.id).map((q) => q.capturedAt).sort().at(-1);
    await putSession({ ...s, status: "ended", endedAt: last ?? new Date().toISOString(), dirty: true });
  }
  void drain();
}

/** Erasure of one recording: marked here at once, removed from the server on the next sync. */
export async function deleteRecording(sessionId: string): Promise<void> {
  const s = await getSession(sessionId);
  if (!s) return;
  await putSession({ ...s, status: "undone", dirty: true });
  await drain();
}

export function recordingTitle(iso: string, locale: string): string {
  const d = new Date(iso);
  const day = d.toLocaleDateString(locale, { weekday: "long" });
  const time = d.toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" });
  const h = d.getHours();
  const part = h >= 21 || h < 4 ? "night" : h >= 17 ? "evening" : h >= 12 ? "afternoon" : "morning";
  return locale.startsWith("en") ? `${day} ${part}, ${time.toLowerCase()}` : `${day}, ${time}`;
}

/** The date and time in a downloaded file's name, by the phone's clock: 20261031-1246. */
export function fileStamp(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}

export function shortHash(hex: string): string {
  return `${hex.slice(0, 8)} … ${hex.slice(-8)}`;
}
