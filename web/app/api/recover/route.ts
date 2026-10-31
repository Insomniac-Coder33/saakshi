// Moving her Saakshi to a new phone, from the new phone's side.
//   start:  a fresh phone (its own anonymous account, no setup yet) gets a six-digit code.
//   status: has she got enough approvals yet?
//   claim:  once approved, her other devices are signed out and this phone gets a single-use sign-in token.
//   finish: signed in as her now, the stand-in account is removed.
// The approving happens on Telegram (lib/recovery.ts). Nothing here can open her recordings: that needs her PIN.
import { adminClient } from "@/lib/admin";
import {
  approvalsNeeded,
  CODE_MINUTES,
  expired,
  linkedCount,
  newCode,
  recoveryEmail,
} from "@/lib/recovery";
import { telegramReady } from "@/lib/telegram";

export async function POST(request: Request) {
  if (!telegramReady()) return Response.json({ error: "guardians not configured" }, { status: 503 });
  const token = request.headers.get("authorization")?.replace(/^Bearer /, "");
  if (!token) return Response.json({ error: "missing token" }, { status: 401 });
  const db = adminClient();
  const { data: auth, error } = await db.auth.getUser(token);
  if (error || !auth.user) return Response.json({ error: "invalid token" }, { status: 401 });
  const me = auth.user.id;
  const body = (await request.json().catch(() => ({}))) as { action?: string; id?: string };

  if (body.action === "start") {
    // A phone that already holds a Saakshi can't ask to become someone else's.
    const { data: profile } = await db.from("profiles").select("id").eq("id", me).maybeSingle();
    if (profile) return Response.json({ error: "this phone is already set up" }, { status: 409 });
    await db.from("recoveries").delete().eq("requester", me).eq("status", "open");
    for (let i = 0; i < 5; i++) {
      const { data: rec } = await db
        .from("recoveries")
        .insert({ requester: me, code: newCode(), expires_at: new Date(Date.now() + CODE_MINUTES * 60_000).toISOString() })
        .select("id, code, expires_at")
        .maybeSingle();
      if (rec) return Response.json({ id: rec.id, code: rec.code, expiresAt: rec.expires_at });
    }
    return Response.json({ error: "try again" }, { status: 503 });
  }

  if (!body.id || !/^[0-9a-f-]{36}$/.test(body.id)) return Response.json({ error: "bad request" }, { status: 400 });
  const { data: rec } = await db.from("recoveries").select("id, requester, owner, status, expires_at").eq("id", body.id).maybeSingle();
  if (!rec) return Response.json({ error: "unknown request" }, { status: 404 });

  if (body.action === "finish") {
    if (rec.owner !== me || rec.status !== "claimed") return Response.json({ error: "not yours" }, { status: 403 });
    await db.from("recoveries").update({ status: "done" }).eq("id", rec.id);
    await db.from("audit_log").insert({ owner: me, action: "moved_to_new_phone", subject_id: rec.id });
    // The new phone's stand-in account has done its job (its request row goes with it).
    await db.auth.admin.deleteUser(rec.requester);
    return Response.json({ ok: true });
  }

  if (rec.requester !== me) return Response.json({ error: "not yours" }, { status: 403 });

  if (body.action === "status") {
    const status = rec.status === "open" && expired(rec) ? "expired" : rec.status;
    if (!rec.owner) return Response.json({ status, approvals: 0, needed: null });
    const [{ count }, linked] = await Promise.all([
      db.from("recovery_approvals").select("guardian_id", { count: "exact", head: true }).eq("recovery_id", rec.id),
      linkedCount(db, rec.owner),
    ]);
    return Response.json({ status, approvals: count ?? 0, needed: approvalsNeeded(linked) });
  }

  if (body.action === "claim") {
    // Approved within the code's lifetime, claimed within a second one.
    if ((rec.status !== "approved" && rec.status !== "claimed") || Date.parse(rec.expires_at) + CODE_MINUTES * 60_000 < Date.now() || !rec.owner) {
      return Response.json({ error: "not approved" }, { status: 409 });
    }
    // Claiming again (a sign-in that failed on the phone) just issues a fresh token.
    await db.from("recoveries").update({ status: "claimed" }).eq("id", rec.id);
    // The lost phone, or whoever has it now, is signed out before this one is let in.
    const { error: endError } = await db.rpc("end_sessions_of", { uid: rec.owner });
    // Her account gets an address only so a sign-in token can be made for it. Nothing is ever mailed,
    // and the token works once. (Changing a password instead would sign this new phone out again.)
    const email = recoveryEmail(rec.owner);
    const { error: emailError } = await db.auth.admin.updateUserById(rec.owner, { email, email_confirm: true });
    const { data: link, error: linkError } = emailError
      ? { data: null, error: emailError }
      : await db.auth.admin.generateLink({ type: "magiclink", email });
    const tokenHash = link?.properties?.hashed_token;
    if (endError || linkError || !tokenHash) {
      console.error("[recover]", endError?.message ?? linkError?.message ?? "no token");
      await db.from("recoveries").update({ status: "approved" }).eq("id", rec.id);
      return Response.json({ error: "try again" }, { status: 503 });
    }
    return Response.json({ tokenHash });
  }

  return Response.json({ error: "bad request" }, { status: 400 });
}
