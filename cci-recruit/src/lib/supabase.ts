import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl) {
  throw new Error(
    `VITE_SUPABASE_URL missing. Available env keys: ${Object.keys(import.meta.env).join(", ")}`
  )
}

if (!supabaseAnonKey) {
  throw new Error(
    `VITE_SUPABASE_ANON_KEY missing. Available env keys: ${Object.keys(import.meta.env).join(", ")}`
  )
}

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
)