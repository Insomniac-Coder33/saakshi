// Drains the local outbox to Supabase: session rows first, then each encrypted piece
// (ciphertext to Storage, fingerprint row to the pieces table). Safe to call at any time and
// from several places; only one drain runs at once.
import {
  bumpAttempts,
  deleteLocalSession,
  dequeue,
  dropSession,
  localSessions,
  outbox,
  putSession,
  type LocalSession,
} from "./local";
import { EVIDENCE_BUCKET, supabase } from "./supabase";

let running: Promise<SyncResult> | null = null;
let again = false;
const listeners = new Set<() => void>();

export interface SyncResult {
  uploaded: number;
  pending: number;
}

/** Called after every drain, so screens can refresh their "saved" counts. */
export function onSynced(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function drain(): Promise<SyncResult> {
  if (running) {
    // A piece queued mid-drain isn't in that drain's snapshot, so go round once more.
    again = true;
    return running;
  }
  running = (async () => {
    let result: SyncResult;
    do {
      again = false;
      result = await drainOnce();
      if (result.uploaded) requestSeal();
      listeners.forEach((fn) => fn());
    } while (again);
    return result;
  })().finally(() => {
    running = null;
  });
  return running;
}

async function pushSession(s: LocalSession): Promise<boolean> {
  const { error } = await supabase()
    .from("sessions")
    .upsert({
      id: s.id,
      kind: s.kind,
      status: s.status,
      duress: s.duress,
      ephemeral_public_key: s.ephemeralPublicKey,
      mime: s.mime,
      title: s.title,
      started_at: s.startedAt,
      ended_at: s.endedAt,
    });
  if (error) return false;
  await putSession({ ...s, dirty: false });
  return true;
}

/** An SOS she undid within ten seconds: remove every trace, here and on the server. */
async function discardRemote(s: LocalSession): Promise<void> {
  const sb = supabase();
  await dropSession(s.id);
  const { data: user } = await sb.auth.getUser();
  if (!user.user) return;
  const folder = `${user.user.id}/${s.id}`;
  const { data: files, error: listError } = await sb.storage.from(EVIDENCE_BUCKET).list(folder, { limit: 1000 });
  if (listError) return;
  if (files.length) {
    const { error } = await sb.storage.from(EVIDENCE_BUCKET).remove(files.map((f) => `${folder}/${f.name}`));
    if (error) return;
  }
  const { error } = await sb.from("sessions").delete().eq("id", s.id);
  if (!error) await deleteLocalSession(s.id);
}

async function drainOnce(): Promise<SyncResult> {
  if (typeof navigator !== "undefined" && !navigator.onLine) return { uploaded: 0, pending: (await outbox()).length };
  const sb = supabase();
  const { data } = await sb.auth.getSession();
  if (!data.session) return { uploaded: 0, pending: (await outbox()).length };

  const synced = new Set<string>();
  for (const s of await localSessions()) {
    if (s.status === "undone") await discardRemote(s);
    else if (!s.dirty || (await pushSession(s))) synced.add(s.id);
  }

  let uploaded = 0;
  const items = (await outbox()).sort((a, b) => a.capturedAt.localeCompare(b.capturedAt));
  for (const item of items) {
    if (!synced.has(item.sessionId)) continue;
    const up = await sb.storage
      .from(EVIDENCE_BUCKET)
      .upload(item.storagePath, item.body, { contentType: "application/octet-stream", upsert: false });
    // A retry after a lost response finds the object already there; that counts as done.
    if (up.error && !/exists|duplicate/i.test(up.error.message)) {
      await bumpAttempts(item);
      continue;
    }
    const row = await sb.from("pieces").insert({
      session_id: item.sessionId,
      seq: item.seq,
      segment: item.segment,
      kind: item.kind,
      sha256: item.sha256,
      size: item.size,
      storage_path: item.storagePath,
      captured_at: item.capturedAt,
    });
    if (row.error && row.error.code !== "23505") {
      await bumpAttempts(item);
      continue;
    }
    await dequeue(item.id);
    uploaded++;
  }
  return { uploaded, pending: (await outbox()).length };
}

let sealTimer: number | undefined;

/**
 * Asks the server to seal what just arrived. The sealer spaces seals out; when it says "not yet",
 * ask again once the gap has passed. A database cron also runs it every minute, for phones that
 * were taken before their last pieces were sealed.
 */
export function requestSeal(delayMs = 0): void {
  if (sealTimer !== undefined) return;
  sealTimer = window.setTimeout(async () => {
    sealTimer = undefined;
    try {
      const res = await fetch("/api/seal", { method: "POST" });
      const body = (await res.json()) as { sealed?: number; retryAfter?: number };
      if (body.retryAfter) requestSeal(body.retryAfter * 1000);
    } catch {
      // Offline or the sealer is down: the cron catches up.
    }
    listeners.forEach((fn) => fn());
  }, delayMs);
}

/** Retries whenever the phone comes back online, and every 15 seconds while anything is waiting. */
export function startBackgroundSync(): () => void {
  const kick = () => void drain();
  window.addEventListener("online", kick);
  const timer = window.setInterval(async () => {
    if ((await outbox()).length || (await localSessions()).some((s) => s.dirty)) kick();
  }, 15_000);
  kick();
  return () => {
    window.removeEventListener("online", kick);
    window.clearInterval(timer);
  };
}
