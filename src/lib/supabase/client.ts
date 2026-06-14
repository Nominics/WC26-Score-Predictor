import { createClient as createSupabaseClient } from "@supabase/supabase-js";

let supabase: ReturnType<typeof createSupabaseClient> | undefined;

/**
 * Creates a browser-side Supabase client.
 * Uses resilient defaults to prevent crashes during build or if env vars are missing.
 */
export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "placeholder";

  if (!supabase) {
    supabase = createSupabaseClient(
      supabaseUrl,
      supabaseKey,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          storage: typeof window !== "undefined" ? window.localStorage : undefined,
        },
      }
    );
  }

  return supabase;
}
