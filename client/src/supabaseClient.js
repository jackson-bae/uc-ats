import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)
//for debugging
console.log("URL:", import.meta.env.VITE_SUPABASE_URL);
console.log("KEY:", import.meta.env.VITE_SUPABASE_ANON_KEY?.slice(0, 10));
