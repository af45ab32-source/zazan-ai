import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://sqbzzinfdmrxyjvwrlns.supabase.co";

const supabaseAnonKey =
  "sb_publishable_lOk7hTWfKuDEr6r1Xc9qCA_aIx3ipIF";

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
);
