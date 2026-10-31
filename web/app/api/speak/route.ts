// Reads one of Sahayak's answers aloud. Signed in as her; each listen counts towards Sahayak's daily
// allowance, so the voice can't be run up by anyone.
import { adminClient } from "@/lib/admin";
import type { Language } from "@/lib/local";
import { speak, speechReady } from "@/lib/speech";

export const maxDuration = 30;

const DAILY_LIMIT = 80;
const LANGS: Language[] = ["en", "bn", "hi"];

export async function POST(request: Request) {
  if (!speechReady()) return Response.json({ error: "not configured" }, { status: 503 });
  const token = request.headers.get("authorization")?.replace(/^Bearer /, "");
  if (!token) return Response.json({ error: "missing token" }, { status: 401 });
  const db = adminClient();
  const { data: auth, error } = await db.auth.getUser(token);
  if (error || !auth.user) return Response.json({ error: "invalid token" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { lang?: string; text?: string };
  const lang = LANGS.includes(body.lang as Language) ? (body.lang as Language) : "en";
  const text = typeof body.text === "string" ? body.text.trim().slice(0, 3000) : "";
  if (!text) return Response.json({ error: "nothing to read" }, { status: 400 });

  const { data: used } = await db.rpc("sahayak_tick", { p_owner: auth.user.id });
  if (typeof used === "number" && used > DAILY_LIMIT) return Response.json({ error: "daily limit" }, { status: 429 });

  try {
    const audio = await speak(lang, text);
    return new Response(audio as BodyInit, { headers: { "content-type": "audio/mpeg", "cache-control": "no-store" } });
  } catch (e) {
    console.error("[speak]", e instanceof Error ? e.message : e);
    return Response.json({ error: "voice failed" }, { status: 502 });
  }
}
