import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

/** Where supabase-js keeps her session. Named so it doesn't say "Saakshi" in browser storage. */
export const SESSION_STORAGE_KEY = "calc-state";

/** The browser client. Signs in with the publishable key only; RLS does the rest. */
export function supabase(): SupabaseClient {
  client ??= createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: true, autoRefreshToken: true, storageKey: SESSION_STORAGE_KEY },
  });
  return client;
}

/** Her anonymous account: no email, no phone. Created on first use and kept on this device. */
export async function ensureUser(): Promise<string> {
  const sb = supabase();
  const { data } = await sb.auth.getSession();
  if (data.session) return data.session.user.id;
  const { data: signedIn, error } = await sb.auth.signInAnonymously();
  if (error || !signedIn.user) throw error ?? new Error("Anonymous sign-in failed");
  return signedIn.user.id;
}

export const EVIDENCE_BUCKET = "evidence";
