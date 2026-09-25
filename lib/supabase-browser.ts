import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function hasSupabaseBrowserConfig() {
  return Boolean(supabaseUrl && anonKey);
}

export function getSupabaseBrowser() {
  if (!supabaseUrl || !anonKey) throw new Error('Supabase is not configured.');
  return createClient(supabaseUrl, anonKey);
}
