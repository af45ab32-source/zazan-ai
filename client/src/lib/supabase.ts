import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_SUPABASE_URL) ||
  "https://sqbzzinfdmrxyjvwrlns.supabase.co";

const supabaseAnonKey =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_SUPABASE_ANON_KEY) ||
  "sb_publishable_lOk7hTWfKuDEr6r1Xc9qCA_aIx3ipIF";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
