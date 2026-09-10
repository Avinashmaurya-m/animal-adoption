import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const envUrl = window?.SUPABASE_URL || "https://mmbzenaguwcinuvfjmfo.supabase.co";
const envAnonKey = window?.SUPABASE_ANON_KEY || "sb_publishable_RrAhDXJ7uwt0sSb3KsFyuA_2F0QW__n";

export const supabaseConfig = {
  url: envUrl,
  anonKey: envAnonKey
};

if (!supabaseConfig.url || !supabaseConfig.anonKey) {
  console.warn("Supabase env values are missing. Add SUPABASE_URL and SUPABASE_ANON_KEY to your environment setup.");
}

export const supabase = createClient(supabaseConfig.url, supabaseConfig.anonKey || "", {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});
