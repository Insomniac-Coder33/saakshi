// Sahayak, the legal helper. Signed in as her (her anonymous account), with a daily allowance.
// What she asks goes to the model to be answered and is never stored here.
import { adminClient } from "@/lib/admin";
import type { Language } from "@/lib/local";
import { ask, draft, sahayakReady, type EvidenceLine, type Recipient, type Turn } from "@/lib/sahayak";

export const maxDuration = 60;

const DAILY_LIMIT = 80;
const LANGS: Language[] = ["en", "bn", "hi"];
const RECIPIENTS: Recipient[] = ["police", "protection", "icc", "cyber"];

interface Body {
  mode?: "ask" | "draft";
  lang?: Language;
  minor?: boolean;
  turns?: Turn[];
  recipient?: Recipient;
  evidence?: EvidenceLine[];
}

export async function POST(request: Request) {
  if (!sahayakReady()) return Response.json({ error: "not configured" }, { status: 503 });
  const token = request.headers.get("authorization")?.replace(/^Bearer /, "");
  if (!token) return Response.json({ error: "missing token" }, { status: 401 });
  const db = adminClient();
  const { data: auth, error } = await db.auth.getUser(token);
  if (error || !auth.user) return Response.json({ error: "invalid token" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as Body;
  const lang = LANGS.includes(body.lang as Language) ? (body.lang as Language) : "en";
  const turns = (body.turns ?? [])
    .filter((t) => (t.role === "user" || t.role === "model") && typeof t.text === "string" && t.text.trim())
    .slice(-12);
  if (!turns.length || turns.at(-1)!.role !== "user" && body.mode !== "draft") return Response.json({ error: "nothing asked" }, { status: 400 });

  const { data: used } = await db.rpc("sahayak_tick", { p_owner: auth.user.id });
  if (typeof used === "number" && used > DAILY_LIMIT) return Response.json({ error: "daily limit" }, { status: 429 });

  try {
    if (body.mode === "draft") {
      const recipient = RECIPIENTS.includes(body.recipient as Recipient) ? (body.recipient as Recipient) : "police";
      const evidence = (body.evidence ?? [])
        .filter((e) => /^[0-9a-f]{64}$/.test(e.sha256) && /^https:\/\//.test(e.verifyUrl) && ["recording", "photo", "journal"].includes(e.kind))
        .slice(0, 20);
      return Response.json(await draft(lang, recipient, turns, evidence));
    }
    return Response.json(await ask(lang, !!body.minor, turns));
  } catch (e) {
    console.error("[sahayak]", e instanceof Error ? e.message : e);
    return Response.json({ error: "model failed" }, { status: 502 });
  }
}
