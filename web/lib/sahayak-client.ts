// Sahayak from the phone: asking, drafting a complaint, and listing her sealed evidence for it.
// The conversation lives only in memory on this screen; nothing is saved.
import { localSessions } from "./local";
import type { Language } from "./local";
import type { Answer, Draft, EvidenceLine, Recipient, Turn } from "./sahayak";
import { verifyUrlFor } from "./site";
import { supabase } from "./supabase";

export type { Answer, Draft, EvidenceLine, Recipient, Turn };

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
export async function readAloud(lang: Language, text: string): Promise<Blob> {
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

export const askSahayak =(lang: Language, minor: boolean, turns: Turn[]) => call<Answer>({ mode: "ask", lang, minor, turns });

export const draftComplaint = (lang: Language, recipient: Recipient, turns: Turn[], evidence: EvidenceLine[]) =>
  call<Draft>({ mode: "draft", lang, recipient, turns, evidence });

/**
 * Everything she has that a stranger can check: recordings she has opened (each part has a file
 * fingerprint), and sealed photos and journal entries. Only dates and fingerprints, never content.
 */
export async function sealedEvidence(): Promise<EvidenceLine[]> {
  const sessions = new Map((await localSessions()).filter((s) => s.status !== "undone").map((s) => [s.id, s]));
  const out: EvidenceLine[] = [];
  const sb = supabase();
  const [{ data: files }, { data: pieces }] = await Promise.all([
    sb.from("files").select("session_id, segment, sha256").order("created_at"),
    sb.from("pieces").select("session_id, kind, sha256, seal_id").in("kind", ["image", "text"]).not("seal_id", "is", null),
  ]);
  for (const f of files ?? []) {
    const s = sessions.get(f.session_id);
    if (s?.kind === "sos") out.push({ kind: "recording", at: s.startedAt, sha256: f.sha256, verifyUrl: verifyUrlFor(f.sha256) });
  }
  for (const p of pieces ?? []) {
    const s = sessions.get(p.session_id);
    if (s?.kind === "vault" && p.kind === "image") out.push({ kind: "photo", at: s.startedAt, sha256: p.sha256, verifyUrl: verifyUrlFor(p.sha256) });
    if (s?.kind === "journal" && p.kind === "text") out.push({ kind: "journal", at: s.startedAt, sha256: p.sha256, verifyUrl: verifyUrlFor(p.sha256) });
  }
  return out.sort((a, b) => a.at.localeCompare(b.at));
}
