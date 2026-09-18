import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Si aun no configuraste Supabase (ETAPA 2), la app sigue funcionando
// en modo local/demo. Cuando agregues las variables VITE_SUPABASE_URL
// y VITE_SUPABASE_ANON_KEY en Vercel/.env, isSupabaseConfigured pasa a true
// y el resto del código empieza a usar la base de datos real automáticamente.
export const isSupabaseConfigured = Boolean(url && anonKey)

export const supabase = isSupabaseConfigured
  ? createClient(url, anonKey)
  : null
