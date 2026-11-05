import "server-only";
import { createClient } from "@supabase/supabase-js";

// Full-access client for server code only (ingest, server actions after a role check, the public buyer page).
export function createAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
}
