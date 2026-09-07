import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase environment variables are missing!");
}

export const supabase = createBrowserClient(
  supabaseUrl || '',
  supabaseAnonKey || '',
  {
    // Adding these options helps the SSR client handle "stale" sessions better
    auth: {
      persistSession: true,
      detectSessionInUrl: true,
      flowType: 'pkce', // Recommended for Next.js SSR
    },
  }
);