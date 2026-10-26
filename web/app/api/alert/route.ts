// Guardian alerts from her phone: the SOS started (after the ten seconds to undo), her location
// moved, she typed the duress PIN, or she ended it. Also a test message from Settings.
// Signed in as her: an alert can only ever be about her own session, to her own guardians.
import { adminClient } from "@/lib/admin";
import { handle, linkedGuardians, profileOf, type AlertEvent, type Fix } from "@/lib/alerts";
import { message, send, telegramReady } from "@/lib/telegram";

const EVENTS: AlertEvent[] = ["start", "location", "duress", "end"];

export async function POST(request: Request) {
  if (!telegramReady()) return Response.json({ error: "alerts not configured" }, { status: 503 });
  const token = request.headers.get("authorization")?.replace(/^Bearer /, "");
  if (!token) return Response.json({ error: "missing token" }, { status: 401 });
  const db = adminClient();
  const { data: auth, error } = await db.auth.getUser(token);
  if (error || !auth.user) return Response.json({ error: "invalid token" }, { status: 401 });
  const owner = auth.user.id;

  const body = (await request.json().catch(() => ({}))) as { event?: string; sessionId?: string; fix?: Fix | null };

  if (body.event === "test") {
    const { name, lang } = await profileOf(db, owner);
    const guardians = await linkedGuardians(db, owner);
    const sent = await Promise.all(guardians.map((g) => send(g.chat_id, message(lang, "test", name)).then(() => 1, () => 0)));
    return Response.json({ sent: sent.reduce<number>((a, b) => a + b, 0), guardians: guardians.length });
  }

  if (!EVENTS.includes(body.event as AlertEvent) || !body.sessionId) return Response.json({ error: "bad request" }, { status: 400 });
  const { data: session } = await db.from("sessions").select("owner, kind").eq("id", body.sessionId).maybeSingle();
  // The phone sends its first alert ten seconds in; if the session row hasn't synced yet, it retries.
  if (!session) return Response.json({ error: "unknown session" }, { status: 404 });
  if (session.owner !== owner || session.kind !== "sos") return Response.json({ error: "not yours" }, { status: 403 });

  const fix = body.fix && Number.isFinite(body.fix.lat) && Number.isFinite(body.fix.lng) ? body.fix : null;
  await handle(db, owner, body.sessionId, body.event as AlertEvent, fix);
  return Response.json({ ok: true });
}
