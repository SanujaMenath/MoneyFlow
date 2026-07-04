import { createSupabaseClient } from "@moneyflow/shared/lib/supabase";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createSupabaseClient(supabaseUrl, supabaseAnonKey);
