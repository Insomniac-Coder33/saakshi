// Moving her Saakshi to this phone, from the phone's side (the server side is app/api/recover).
import type { Language } from "./local";
import { ensureUser, supabase } from "./supabase";

export interface RecoveryRequest {
  id: string;
  code: string;
  expiresAt: string;
}

export type RecoveryStatus = { status: "open" | "approved" | "declined" | "expired" | "claimed" | "done"; approvals: number; needed: number | null };

/** Her account as the server keeps it: enough to open her vault once she types her PIN. */
export interface RemoteProfile {
  userId: string;
  name: string;
  language: Language;
  ageGroup: "adult" | "minor";
  publicKey: string;
  wrappedPrivateKey: string;
  kdfSalt: string;
  kdfIterations: number;
}

async function call<T>(action: string, id?: string): Promise<T> {
  const { data } = await supabase().auth.getSession();
  const res = await fetch("/api/recover", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${data.session?.access_token ?? ""}` },
    body: JSON.stringify({ action, id }),
  });
  if (!res.ok) throw new Error(`recover ${action}: ${res.status}`);
  return res.json() as Promise<T>;
}

export async function startRecovery(): Promise<RecoveryRequest> {
  await ensureUser();
  return call<RecoveryRequest>("start");
}

export const recoveryStatus = (id: string) => call<RecoveryStatus>("status", id);

/** After approval: sign this phone in to her account, then fetch what's needed to open it. */
export async function completeRecovery(id: string): Promise<RemoteProfile> {
  const { tokenHash } = await call<{ tokenHash: string }>("claim", id);
  const { error } = await supabase().auth.verifyOtp({ type: "email", token_hash: tokenHash });
  if (error) throw error;
  await call("finish", id);
  const profile = await ownProfile();
  if (!profile) throw new Error("no profile after recovery");
  return profile;
}

/**
 * The profile of the account this phone is signed in to, if it has one. A phone can be signed in to
 * her account with nothing on it locally (a move cut short, or cleared storage); then she only needs
 * her PIN, and setting up afresh would overwrite her key.
 */
export async function ownProfile(): Promise<RemoteProfile | null> {
  const sb = supabase();
  const { data: session } = await sb.auth.getSession();
  if (!session.session) return null;
  const { data } = await sb
    .from("profiles")
    .select("id, display_name, language, age_group, public_key, wrapped_private_key, kdf_salt, kdf_iterations")
    .eq("id", session.session.user.id)
    .maybeSingle();
  if (!data) return null;
  return {
    userId: data.id,
    name: data.display_name ?? "",
    language: data.language,
    ageGroup: data.age_group,
    publicKey: data.public_key,
    wrappedPrivateKey: data.wrapped_private_key,
    kdfSalt: data.kdf_salt,
    kdfIterations: data.kdf_iterations,
  };
}
