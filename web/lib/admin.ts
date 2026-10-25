// Server-only Supabase client with the secret key. It bypasses row-level security, so only API
// routes use it, and only for work a phone must not do itself (sealing, public verification, erasure).
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export function adminClient(): SupabaseClient {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
