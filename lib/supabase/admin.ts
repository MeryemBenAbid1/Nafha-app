import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Full-access database client for server code only (ingest, server actions after a role check, the public
// buyer page). Two ways to get one:
//  1. SUPABASE_SERVICE_ROLE_KEY is set: use the service key (bypasses Row Level Security).
//  2. Otherwise sign in as the 'server' account (SERVER_EMAIL / SERVER_PASSWORD). The "server all" policies in
//     supabase/migrations/002 give that account full access. This avoids handing the service key around.
let cached: { client: SupabaseClient; expiresAt: number } | null = null;

export async function createAdminClient(): Promise<SupabaseClient> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  }
  if (cached && cached.expiresAt - 60_000 > Date.now()) return cached.client;

  const client = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.signInWithPassword({
    email: process.env.SERVER_EMAIL!,
    password: process.env.SERVER_PASSWORD!,
  });
  if (error || !data.session) throw new Error(`server sign-in failed: ${error?.message ?? "no session"}`);
  cached = { client, expiresAt: (data.session.expires_at ?? 0) * 1000 };
  return client;
}
