import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { syncAuthCookie, clearAuthCookie } from './cookies';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;

let browserClient: SupabaseClient | null = null;

export function hasSupabaseBrowserConfig() {
  return Boolean(supabaseUrl && anonKey);
}

export function getSupabaseBrowser(): SupabaseClient {
  if (!supabaseUrl || !anonKey) throw new Error('Supabase is not configured.');
  if (browserClient) return browserClient;

  browserClient = createClient(supabaseUrl, anonKey);

  // In browser runtime, synchronize authentication sessions to secure cookie
  if (typeof window !== 'undefined') {
    browserClient.auth.onAuthStateChange((event, session) => {
      if (session?.access_token) {
        syncAuthCookie(session.access_token, session.expires_in);
      } else if (event === 'SIGNED_OUT') {
        clearAuthCookie();
      }
    });

    // Sync existing cached session on first initialization
    browserClient.auth.getSession().then(({ data }) => {
      if (data.session?.access_token) {
        syncAuthCookie(data.session.access_token, data.session.expires_in);
      }
    }).catch(() => {});
  }

  return browserClient;
}
