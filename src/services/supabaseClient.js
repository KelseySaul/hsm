import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Supabase credentials missing! Check your .env file.");
}

// Standard client — single shared instance for the whole app
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'phc-auth-token', // explicit key prevents collisions
  }
})

// Admin client — uses a completely separate storage to prevent the
// "Multiple GoTrueClient instances" warning. In-memory only, never persisted.
export const supabaseAdmin = supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
      storageKey: 'phc-admin-token', // separate key to avoid any collision
      storage: {
        getItem: () => null,
        setItem: () => null,
        removeItem: () => null
      }
    }
  })
  : null;