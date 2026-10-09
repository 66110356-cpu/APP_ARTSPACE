import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabaseReady = Boolean(supabaseUrl && supabaseAnonKey)
export const supabase = supabaseReady
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      }
    })
  : null

export function requireSupabase() {
  if (!supabase) {
    throw new Error(
      'ArtSpace is not connected to Supabase yet. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, then restart the app.'
    )
  }
  return supabase
}
