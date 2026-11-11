import { supabase } from './supabase'

// Chiama la funzione sicura "admin-students" (solo amministratore)
export async function callAdminFunction(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke('admin-students', { body })
  if (error) {
    let message = error.message
    try {
      const ctx = (error as unknown as { context?: Response }).context
      if (ctx && typeof ctx.json === 'function') {
        const j = await ctx.json()
        if (j?.error) message = j.error
      }
    } catch {
      /* si tiene il messaggio generico */
    }
    throw new Error(message)
  }
  if (data?.error) throw new Error(data.error)
  return data
}

// Scrive una riga nello storico delle attività
export async function logActivity(studentId: string, action: string, details?: string) {
  const { data } = await supabase.auth.getSession()
  await supabase.from('activity_log').insert({
    actor_id: data.session?.user.id ?? null,
    student_id: studentId,
    action,
    details: details ?? null,
  })
}

// Password casuale leggibile (senza caratteri ambigui come 0/O o 1/l)
export function generatePassword(length = 10): string {
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const bytes = new Uint32Array(length)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (n) => chars[n % chars.length]).join('')
}

export function parseSubjects(text: string): string[] {
  return text
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}
