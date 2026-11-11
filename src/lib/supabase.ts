import { createClient } from '@supabase/supabase-js'

// Questi due valori sono PUBBLICI per natura: la sicurezza dei dati
// è garantita dalle regole nel database, non dal tenerli nascosti.
// La chiave "secret" / "service_role" NON va mai scritta qui.
const SUPABASE_URL = 'https://pcnwxvoxffoselburduk.supabase.co'
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_bM7WVPx9I4okiP_JTclDog_AuZbCLmZ'

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY)
