// The other two kinds of evidence, sealed exactly like an SOS recording:
// - a photo or screenshot (harassing chats, injuries, or her own original photo, so a morphed copy
//   can later be told apart): one "image" piece holding the file byte for byte, plus an encrypted
//   "text" piece with its name, date and her note;
// - a journal entry (what happened, when): one "text" piece holding a plain-text file, so the very
//   file she downloads is the one that was sealed and can be checked on the Verify page.
import { decryptPiece, encryptPiece, openSessionForReading, openSessionForWriting, sha256Hex } from "./crypto";
import { enqueue, localSessions, outbox, putSession, type DeviceSetup, type LocalSession } from "./local";
import { listPieces, type PieceInfo } from "./recordings";
import { EVIDENCE_BUCKET, supabase } from "./supabase";
import { drain } from "./sync";

export type EvidenceKind = "vault" | "journal";

/** Matches the evidence bucket's 25 MB file limit, less room for the encryption overhead. */
export const MAX_PHOTO_BYTES = 24 * 1024 * 1024;

export interface PhotoMeta {
  name: string;
  type: string;
  lastModified: string; // the file's own date, as the phone reports it
  note: string;
}

async function seal(setup: DeviceSetup, kind: EvidenceKind, mime: string, pieces: { kind: "image" | "text"; bytes: ArrayBuffer }[]) {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const { key, ephemeralPublicKey } = await openSessionForWriting(setup.publicKey, id);
  const session: LocalSession = {
    id,
    kind,
    status: "ended",
    duress: false,
    ephemeralPublicKey,
    mime,
    title: null, // titles would be readable on the server; hers stay inside the encrypted pieces
    startedAt: now,
    endedAt: now,
    dirty: true,
  };
  await putSession(session);
  for (const p of pieces) {
    const [sha256, cipher] = await Promise.all([sha256Hex(p.bytes), encryptPiece(key, p.bytes)]);
    await enqueue({
      id: `${id}:${p.kind}:0`,
      sessionId: id,
      kind: p.kind,
      seq: 0,
      segment: 0,
      sha256,
      size: p.bytes.byteLength,
      storagePath: `${setup.userId}/${id}/${p.kind === "image" ? "i" : "t"}-00000.bin`,
      capturedAt: now,
      body: new Blob([cipher]),
      attempts: 0,
    });
  }
  void drain();
  return id;
}

/** Seals a photo or screenshot exactly as it is. Nothing is resized or re-encoded. */
export async function addPhoto(setup: DeviceSetup, file: File, note: string): Promise<string> {
  const meta: PhotoMeta = {
    name: file.name,
    type: file.type || "image/jpeg",
    lastModified: new Date(file.lastModified || Date.now()).toISOString(),
    note: note.trim(),
  };
  return seal(setup, "vault", meta.type, [
    { kind: "image", bytes: await file.arrayBuffer() },
    { kind: "text", bytes: new TextEncoder().encode(JSON.stringify(meta)).buffer as ArrayBuffer },
  ]);
}

/** The exact text that is sealed: a heading with the date, then her words. */
export function journalText(body: string, at: Date): string {
  const when = at.toLocaleString("en-IN", { dateStyle: "long", timeStyle: "short", timeZone: "Asia/Kolkata" });
  return `Journal entry\nWritten ${when} IST\n\n${body.trim()}\n`;
}

export async function addJournal(setup: DeviceSetup, body: string): Promise<string> {
  const bytes = new TextEncoder().encode(journalText(body, new Date()));
  return seal(setup, "journal", "text/plain", [{ kind: "text", bytes: bytes.buffer as ArrayBuffer }]);
}

export interface EvidenceSummary {
  session: LocalSession;
  pending: boolean;
  sealed: boolean;
}

/** Her photos or journal entries, newest first. Works offline from the local copy. */
export async function listEvidence(kind: EvidenceKind): Promise<EvidenceSummary[]> {
  const [sessions, queued] = await Promise.all([localSessions(), outbox()]);
  const mine = sessions.filter((s) => s.kind === kind && s.status !== "undone");
  const sealed = new Set<string>();
  try {
    const { data } = await supabase()
      .from("pieces")
      .select("session_id, seals(status)")
      .in("session_id", mine.map((s) => s.id))
      .overrideTypes<{ session_id: string; seals: { status: string } | null }[]>();
    const open = new Set<string>();
    const seen = new Set<string>();
    for (const r of data ?? []) {
      seen.add(r.session_id);
      if (r.seals?.status !== "confirmed") open.add(r.session_id);
    }
    for (const id of seen) if (!open.has(id)) sealed.add(id);
  } catch {
    // Offline: nothing is shown as sealed until we can check.
  }
  return mine
    .map((s) => ({ session: s, pending: queued.some((q) => q.sessionId === s.id), sealed: sealed.has(s.id) }))
    .sort((a, b) => b.session.startedAt.localeCompare(a.session.startedAt));
}

export interface OpenedEvidence {
  pieces: PieceInfo[];
  file: Blob; // the sealed bytes: the photo itself, or the journal entry's text file
  text: string | null; // the journal entry, for reading
  meta: PhotoMeta | null; // a photo's name, date and note
}

async function cipherOf(p: PieceInfo): Promise<Uint8Array<ArrayBuffer>> {
  if (p.local) return new Uint8Array(await p.local.arrayBuffer());
  const { data, error } = await supabase().storage.from(EVIDENCE_BUCKET).download(p.storagePath);
  if (error || !data) throw error ?? new Error("download failed");
  return new Uint8Array(await data.arrayBuffer());
}

/** Decrypts one photo or journal entry on her phone. */
export async function openEvidence(session: LocalSession, privateKey: CryptoKey): Promise<OpenedEvidence> {
  const pieces = await listPieces(session.id);
  const key = await openSessionForReading(privateKey, session.ephemeralPublicKey, session.id);
  const read = async (kind: "image" | "text") => {
    const p = pieces.find((x) => x.kind === kind);
    return p ? decryptPiece(key, await cipherOf(p)) : null;
  };
  const decoder = new TextDecoder();
  if (session.kind === "journal") {
    const bytes = await read("text");
    if (!bytes) throw new Error("missing entry");
    return { pieces, file: new Blob([bytes], { type: "text/plain" }), text: decoder.decode(bytes), meta: null };
  }
  const [image, metaBytes] = await Promise.all([read("image"), read("text")]);
  if (!image) throw new Error("missing image");
  const meta = metaBytes ? (JSON.parse(decoder.decode(metaBytes)) as PhotoMeta) : null;
  return { pieces, file: new Blob([image], { type: meta?.type ?? session.mime ?? "image/jpeg" }), text: null, meta };
}

/** The first line of her words, for the journal list. */
export function journalPreview(text: string): string {
  const body = text.split("\n").slice(3).join(" ").trim();
  return body.length > 90 ? `${body.slice(0, 88)}…` : body;
}
