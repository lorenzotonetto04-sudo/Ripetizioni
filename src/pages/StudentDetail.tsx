import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import StudentForm from '../components/StudentForm'
import StudentLessonsTab from '../components/StudentLessonsTab'
import type { StudentValues } from '../components/StudentForm'
import { callAdminFunction, generatePassword, logActivity, parseSubjects } from '../lib/adminApi'

type Student = {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string | null
  class_name: string | null
  school: string | null
  subjects: string[]
  start_date: string | null
  active: boolean
}

export default function StudentDetail() {
  const { id } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = searchParams.get('sezione') === 'lezioni' ? 'lezioni' : 'scheda'
  const [student, setStudent] = useState<Student | null>(null)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [version, setVersion] = useState(0)

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const [newPassword, setNewPassword] = useState('')
  const [pwBusy, setPwBusy] = useState(false)
  const [pwError, setPwError] = useState<string | null>(null)
  const [pwMessage, setPwMessage] = useState<string | null>(null)

  const [stateBusy, setStateBusy] = useState(false)
  const [stateError, setStateError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!id) return
    const [s, n] = await Promise.all([
      supabase.from('students').select('*').eq('id', id).maybeSingle(),
      supabase.from('student_private_notes').select('notes').eq('student_id', id).maybeSingle(),
    ])
    if (s.error) setLoadError('Impossibile caricare lo studente: ' + s.error.message)
    else if (!s.data) setLoadError('Studente non trovato.')
    else {
      setStudent(s.data as Student)
      setNotes(n.data?.notes ?? '')
      setLoadError(null)
      setVersion((x) => x + 1)
    }
    setLoading(false)
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  async function handleSave(v: StudentValues) {
    if (!student) return
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      const newEmail = v.email.trim().toLowerCase()
      if (newEmail !== student.email.toLowerCase()) {
        await callAdminFunction({ action: 'update_email', id: student.id, email: newEmail })
      }
      const first = v.first_name.trim()
      const last = v.last_name.trim()
      const { error: e1 } = await supabase
        .from('students')
        .update({
          first_name: first,
          last_name: last,
          phone: v.phone.trim() || null,
          class_name: v.class_name.trim() || null,
          school: v.school.trim() || null,
          subjects: parseSubjects(v.subjects),
          start_date: v.start_date || null,
        })
        .eq('id', student.id)
      if (e1) throw new Error(e1.message)
      const { error: e2 } = await supabase
        .from('profiles')
        .update({ full_name: `${first} ${last}` })
        .eq('id', student.id)
      if (e2) throw new Error(e2.message)
      const { error: e3 } = await supabase.from('student_private_notes').upsert({
        student_id: student.id,
        notes: v.notes,
        updated_at: new Date().toISOString(),
      })
      if (e3) throw new Error(e3.message)
      await logActivity(student.id, 'Dati studente modificati', `${first} ${last}`)
      setMessage('Modifiche salvate.')
      await load()
    } catch (e) {
      setError((e as Error).message)
    }
    setBusy(false)
  }

  async function handlePassword(e: FormEvent) {
    e.preventDefault()
    if (!student) return
    setPwBusy(true)
    setPwError(null)
    setPwMessage(null)
    try {
      await callAdminFunction({ action: 'set_password', id: student.id, password: newPassword })
      setPwMessage('Password aggiornata. Comunicala allo studente.')
      setNewPassword('')
    } catch (err) {
      setPwError((err as Error).message)
    }
    setPwBusy(false)
  }

  async function handleActive(active: boolean) {
    if (!student) return
    const text = active
      ? 'Riattivare questo studente? Potrà accedere di nuovo.'
      : 'Archiviare questo studente? Non potrà più accedere finché non lo riattivi. I suoi dati restano salvati.'
    if (!window.confirm(text)) return
    setStateBusy(true)
    setStateError(null)
    try {
      await callAdminFunction({ action: 'set_active', id: student.id, active })
      await load()
    } catch (e) {
      setStateError((e as Error).message)
    }
    setStateBusy(false)
  }

  if (loading) return <p className="muted">Caricamento…</p>
  if (loadError || !student) {
    return (
      <>
        <Link to="/studenti" className="back">← Studenti</Link>
        <p className="error">{loadError}</p>
      </>
    )
  }

  const initial: StudentValues = {
    first_name: student.first_name,
    last_name: student.last_name,
    email: student.email,
    phone: student.phone ?? '',
    class_name: student.class_name ?? '',
    school: student.school ?? '',
    subjects: student.subjects.join(', '),
    start_date: student.start_date ?? '',
    notes,
    password: '',
  }

  return (
    <>
      <Link to="/studenti" className="back">← Studenti</Link>
      <div className="page-head">
        <h1 className="page-title">
          {student.first_name} {student.last_name}
        </h1>
        {!student.active && <span className="badge">Archiviato</span>}
      </div>

      <div className="tabs" role="tablist">
        <button className={tab === 'scheda' ? 'on' : ''} onClick={() => setSearchParams({})}>
          Scheda
        </button>
        <button
          className={tab === 'lezioni' ? 'on' : ''}
          onClick={() => setSearchParams({ sezione: 'lezioni' })}
        >
          Lezioni
        </button>
      </div>

      {tab === 'lezioni' && <StudentLessonsTab studentId={student.id} />}

      {tab === 'scheda' && (
      <div className="stack">
        <section className="panel">
          <h2>Scheda</h2>
          <StudentForm
            key={version}
            mode="edit"
            initial={initial}
            busy={busy}
            error={error}
            submitLabel="Salva modifiche"
            onSubmit={handleSave}
          />
          {message && <p className="success">{message}</p>}
          <p className="muted small">
            Se cambi l’email, cambia anche l’email usata dallo studente per accedere.
          </p>
        </section>

        <section className="panel">
          <h2>Nuova password</h2>
          <form onSubmit={handlePassword}>
            <div className="inline-field">
              <input
                aria-label="Nuova password"
                required
                minLength={8}
                autoComplete="off"
                placeholder="Minimo 8 caratteri"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <button
                type="button"
                className="btn secondary inline"
                onClick={() => setNewPassword(generatePassword())}
              >
                Genera
              </button>
            </div>
            {pwError && <p className="error">{pwError}</p>}
            {pwMessage && <p className="success">{pwMessage}</p>}
            <button type="submit" className="btn" disabled={pwBusy}>
              {pwBusy ? 'Salvataggio…' : 'Imposta password'}
            </button>
          </form>
        </section>

        <section className="panel">
          <h2>Stato dell’account</h2>
          <p className="muted">
            {student.active
              ? 'Lo studente è attivo e può accedere.'
              : 'Lo studente è archiviato e non può accedere.'}
          </p>
          {stateError && <p className="error">{stateError}</p>}
          <button
            className="btn secondary"
            disabled={stateBusy}
            onClick={() => handleActive(!student.active)}
          >
            {student.active ? 'Archivia studente' : 'Riattiva studente'}
          </button>
        </section>
      </div>
      )}
    </>
  )
}
