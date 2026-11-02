// Deletes the caller's Supabase user. Every table cascades from auth.users, so this removes her
// profile, sessions and piece rows. Storage objects do not cascade, so they are removed first.
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer /, "");
  if (!token) return Response.json({ error: "missing token" }, { status: 401 });

  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return Response.json({ error: "invalid token" }, { status: 401 });

  const uid = data.user.id;
  const bucket = admin.storage.from("evidence");
  // A listing returns at most 1,000 names and an hour-long SOS holds more, so empty each folder page by page.
  const { data: folders } = await bucket.list(uid, { limit: 1000 });
  for (const folder of folders ?? []) {
    for (let page = 0; page < 100; page++) {
      const { data: files } = await bucket.list(`${uid}/${folder.name}`, { limit: 1000 });
      if (!files?.length) break;
      const { error: removeError } = await bucket.remove(files.map((f) => `${uid}/${folder.name}/${f.name}`));
      if (removeError) return Response.json({ error: "erase failed" }, { status: 500 });
    }
  }
  const del = await admin.auth.admin.deleteUser(uid);
  if (del.error) return Response.json({ error: "delete failed" }, { status: 500 });
  // Her trail goes with her; only the fact that an erasure happened remains, with no owner.
  await admin.from("audit_log").delete().eq("owner", uid);
  await admin.from("audit_log").insert({ owner: null, action: "account.erase", detail: {} });
  return Response.json({ ok: true });
}
