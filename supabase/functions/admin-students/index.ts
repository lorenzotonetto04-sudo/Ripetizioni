// Funzione sicura eseguita dentro Supabase.
// Solo l'amministratore può usarla: l'identità viene verificata qui,
// ad ogni richiesta, leggendo il ruolo dal database.
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function clean(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const t = v.trim()
  return t === '' ? null : t
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Metodo non consentito.' }, 405)

  try {
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    )

    // 1. Chi sta chiamando? Deve essere un amministratore.
    const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
    if (!token) return json({ error: 'Non autorizzato.' }, 401)
    const { data: userData, error: userErr } = await admin.auth.getUser(token)
    if (userErr || !userData.user) return json({ error: 'Non autorizzato.' }, 401)
    const adminId = userData.user.id
    const { data: callerProfile } = await admin
      .from('profiles')
      .select('role')
      .eq('id', adminId)
      .maybeSingle()
    if (callerProfile?.role !== 'admin') return json({ error: 'Non autorizzato.' }, 403)

    // 2. Quale operazione?
    const b = await req.json()
    const action = b?.action

    const log = (student_id: string, actionText: string, details?: string) =>
      admin.from('activity_log').insert({
        actor_id: adminId,
        student_id,
        action: actionText,
        details: details ?? null,
      })

    const emailTaken = (err: { code?: string; message?: string } | null) =>
      err?.code === 'email_exists' || /already/i.test(err?.message ?? '')

    // ---------- Crea un nuovo studente ----------
    if (action === 'create') {
      const first = clean(b.first_name)
      const last = clean(b.last_name)
      const email = clean(b.email)?.toLowerCase()
      const password = typeof b.password === 'string' ? b.password : ''
      if (!first || !last || !email) {
        return json({ error: 'Nome, cognome ed email sono obbligatori.' }, 400)
      }
      if (password.length < 8) {
        return json({ error: 'La password deve avere almeno 8 caratteri.' }, 400)
      }

      const { data: created, error: cErr } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      })
      if (cErr || !created.user) {
        if (emailTaken(cErr)) return json({ error: 'Esiste già un account con questa email.' }, 409)
        return json({ error: 'Creazione non riuscita: ' + (cErr?.message ?? 'errore') }, 500)
      }
      const id = created.user.id
      const rollback = () => admin.auth.admin.deleteUser(id)

      const { error: pErr } = await admin
        .from('profiles')
        .insert({ id, role: 'student', full_name: `${first} ${last}`, email })
      if (pErr) {
        await rollback()
        return json({ error: 'Creazione del profilo non riuscita: ' + pErr.message }, 500)
      }

      const subjects = Array.isArray(b.subjects)
        ? b.subjects.filter((s: unknown) => typeof s === 'string' && s.trim()).map((s: string) => s.trim())
        : []
      const { error: sErr } = await admin.from('students').insert({
        id,
        first_name: first,
        last_name: last,
        email,
        phone: clean(b.phone),
        class_name: clean(b.class_name),
        school: clean(b.school),
        subjects,
        start_date: clean(b.start_date),
      })
      if (sErr) {
        await rollback()
        return json({ error: 'Creazione della scheda non riuscita: ' + sErr.message }, 500)
      }

      const notes = clean(b.notes)
      if (notes) await admin.from('student_private_notes').insert({ student_id: id, notes })
      await log(id, 'Studente creato', `${first} ${last}`)
      return json({ id })
    }

    // ---------- Operazioni su uno studente esistente ----------
    const id = clean(b.id)
    if (!id) return json({ error: 'Studente non specificato.' }, 400)
    const { data: st } = await admin.from('students').select('id').eq('id', id).maybeSingle()
    if (!st) return json({ error: 'Studente non trovato.' }, 404)

    if (action === 'update_email') {
      const email = clean(b.email)?.toLowerCase()
      if (!email) return json({ error: 'Email non valida.' }, 400)
      const { error } = await admin.auth.admin.updateUserById(id, { email, email_confirm: true })
      if (error) {
        if (emailTaken(error)) return json({ error: 'Esiste già un account con questa email.' }, 409)
        return json({ error: 'Cambio email non riuscito: ' + error.message }, 500)
      }
      await admin.from('students').update({ email }).eq('id', id)
      await admin.from('profiles').update({ email }).eq('id', id)
      await log(id, 'Email di accesso modificata', email)
      return json({ ok: true })
    }

    if (action === 'set_password') {
      const password = typeof b.password === 'string' ? b.password : ''
      if (password.length < 8) {
        return json({ error: 'La password deve avere almeno 8 caratteri.' }, 400)
      }
      const { error } = await admin.auth.admin.updateUserById(id, { password })
      if (error) return json({ error: 'Cambio password non riuscito: ' + error.message }, 500)
      await log(id, 'Password reimpostata')
      return json({ ok: true })
    }

    if (action === 'set_active') {
      const active = b.active === true
      // Uno studente archiviato non può più accedere
      const { error } = await admin.auth.admin.updateUserById(id, {
        ban_duration: active ? 'none' : '876000h',
      })
      if (error) return json({ error: 'Operazione non riuscita: ' + error.message }, 500)
      await admin.from('students').update({ active }).eq('id', id)
      await log(id, active ? 'Studente riattivato' : 'Studente archiviato')
      return json({ ok: true })
    }

    return json({ error: 'Operazione sconosciuta.' }, 400)
  } catch (e) {
    return json({ error: 'Errore interno: ' + (e instanceof Error ? e.message : String(e)) }, 500)
  }
})
