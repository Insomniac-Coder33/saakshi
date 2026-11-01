// Sahayak from the phone: asking, drafting a complaint, and listing her sealed evidence for it.
// The conversation lives only in memory on this screen; nothing is saved.
import { localSessions } from "./local";
import { listEvidence, openEvidence } from "./evidence";
import { fileStamp } from "./recordings";
import type { Answer, Draft, EvidenceLine, Recipient, Turn } from "./sahayak";
import type { Tongue } from "./tongues";
import { verifyUrlFor } from "./site";
import { supabase } from "./supabase";

export type { Answer, Draft, EvidenceLine, Recipient, Turn };

/** One sealed item, with what the court packet's certificate needs to describe the file. */
export interface SealedItem extends EvidenceLine {
  sessionId: string;
  segment: number; // which part of a recording; 0 for a photo or journal entry
  bytes: number;
  fileName: string; // as she downloads it
}

const IMAGE_EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/heic": "heic", "image/gif": "gif" };

export class SahayakError extends Error {
  constructor(public kind: "limit" | "offline" | "failed") {
    super(kind);
  }
}

async function call<T>(body: object): Promise<T> {
  const { data } = await supabase().auth.getSession();
  if (!data.session) throw new SahayakError("offline");
  let res: Response;
  try {
    res = await fetch("/api/sahayak", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${data.session.access_token}` },
      body: JSON.stringify(body),
    });
  } catch {
    throw new SahayakError("offline");
  }
  if (res.status === 429) throw new SahayakError("limit");
  if (!res.ok) throw new SahayakError("failed");
  return (await res.json()) as T;
}

/** An answer read aloud, as MP3 audio. */
export async function readAloud(lang: Tongue, text: string): Promise<Blob> {
  const { data } = await supabase().auth.getSession();
  if (!data.session) throw new SahayakError("offline");
  const res = await fetch("/api/speak", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${data.session.access_token}` },
    body: JSON.stringify({ lang, text }),
  }).catch(() => null);
  if (!res) throw new SahayakError("offline");
  if (res.status === 429) throw new SahayakError("limit");
  if (!res.ok) throw new SahayakError("failed");
  return res.blob();
}

export const askSahayak = (lang: Tongue, minor: boolean, turns: Turn[]) => call<Answer>({ mode: "ask", lang, minor, turns });

export const draftComplaint = (lang: Tongue, recipient: Recipient, turns: Turn[], evidence: EvidenceLine[], journal: string[]) =>
  call<Draft>({ mode: "draft", lang, recipient, turns, evidence, journal });

/**
 * Everything she has that a stranger can check: recordings she has opened (each part has a file
 * fingerprint), and sealed photos and journal entries. Only dates, sizes and fingerprints, never content.
 */
export async function sealedEvidence(): Promise<SealedItem[]> {
  const sessions = new Map((await localSessions()).filter((s) => s.status !== "undone").map((s) => [s.id, s]));
  const out: SealedItem[] = [];
  const sb = supabase();
  const [{ data: files }, { data: pieces }] = await Promise.all([
    sb.from("files").select("session_id, segment, sha256, size").order("segment"),
    sb.from("pieces").select("session_id, kind, sha256, size, seal_id").in("kind", ["image", "text"]).not("seal_id", "is", null),
  ]);
  for (const f of files ?? []) {
    const s = sessions.get(f.session_id);
    if (s?.kind !== "sos") continue;
    // Named as the recording screen names its download: a number only when there are several parts.
    const parts = (files ?? []).filter((x) => x.session_id === f.session_id);
    const ext = s.mime?.includes("mp4") ? "mp4" : "webm";
    const fileName = `recording-${fileStamp(s.startedAt)}${parts.length > 1 ? `-${parts.indexOf(f) + 1}` : ""}.${ext}`;
    out.push({ kind: "recording", at: s.startedAt, sha256: f.sha256, verifyUrl: verifyUrlFor(f.sha256), sessionId: s.id, segment: f.segment, bytes: f.size, fileName });
  }
  for (const p of pieces ?? []) {
    const s = sessions.get(p.session_id);
    const base = { at: s?.startedAt ?? "", sha256: p.sha256, verifyUrl: verifyUrlFor(p.sha256), sessionId: p.session_id, segment: 0, bytes: p.size };
    if (s?.kind === "vault" && p.kind === "image")
      out.push({ ...base, kind: "photo", fileName: `image-${fileStamp(s.startedAt)}.${IMAGE_EXT[s.mime ?? ""] ?? "jpg"}` });
    if (s?.kind === "journal" && p.kind === "text") out.push({ ...base, kind: "journal", fileName: `note-${fileStamp(s.startedAt)}.txt` });
  }
  return out.sort((a, b) => a.at.localeCompare(b.at));
}

/** Her journal entries as sealed, oldest first, decrypted on the phone, for a draft she chose to base on them. */
export async function journalTexts(privateKey: CryptoKey): Promise<string[]> {
  const entries = (await listEvidence("journal")).sort((a, b) => a.session.startedAt.localeCompare(b.session.startedAt)).slice(-20);
  const opened = await Promise.all(entries.map((e) => openEvidence(e.session, privateKey).then((o) => o.text ?? "", () => "")));
  return opened.filter(Boolean);
}
