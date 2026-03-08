import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

if (!supabaseUrl) {
    throw new Error("[Clio] Missing NEXT_PUBLIC_SUPABASE_URL in environment")
}

// Default export uses the ANON key (runs with RLS, safe for general use)
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
if (!anonKey) {
    throw new Error("[Clio] Missing NEXT_PUBLIC_SUPABASE_ANON_KEY in environment")
}
export const supabase = createClient(supabaseUrl, anonKey)

// Separate admin client factory uses the SERVICE ROLE key (bypasses RLS)
export const createSupabaseAdmin = () => {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceKey) {
        throw new Error("[Clio] Missing SUPABASE_SERVICE_ROLE_KEY for admin actions")
    }
    return createClient(supabaseUrl, serviceKey)
}
