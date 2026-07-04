import { createClient, type SupabaseClientOptions } from "@supabase/supabase-js";

export function createSupabaseClient(
  supabaseUrl: string | undefined,
  supabaseAnonKey: string | undefined,
  options?: SupabaseClientOptions<"public">
) {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing Supabase environment variables. Create a .env file based on .env.example."
    );
  }

  return createClient(supabaseUrl, supabaseAnonKey, options);
}
