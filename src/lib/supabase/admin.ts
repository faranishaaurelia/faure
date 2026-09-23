import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Klien dengan SERVICE ROLE KEY — hanya dipakai di server (server actions),
// untuk operasi admin seperti upload gambar ke storage tanpa terbentur RLS.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}