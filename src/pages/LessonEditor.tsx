import { useEffect, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { todayISO, formatDate } from '../lib/format'
import { logActivity } from '../lib/adminApi'
import { STATUS_LABEL, STATUS_OPTIONS } from '../components/lessonUi'
import type { LessonStatus } from '../components/lessonUi'

type StudentOpt = {
  id: string
  first_name: string
  last_name: string
  subjects: string[]
  active: boolean
}

type Values = {
  student_id: string
  lesson_date: string
  start_time: string
  end_time: string
  subject: string
  topic: string
  description: string
  homework: string
  status: LessonStatus
  notes: string
}

export default function LessonEditor({ mode }: { mode: 'create' | 'edit' }) {
  const { id } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()

  const [students, setStudents] = useState<StudentOpt[]>([])
  const [v, setV] = useState<Values | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fromStudent = params.get('studente')

  useEffect(() => {
    let cancelled = false
    async function load() {
      const st = await supabase
        .from('students')
        .select('id, first_name, last_name, subjects, active')
        .order('last_name')
        .order('first_name')
      if (cancelled) return
      if (st.error) {
        setLoadError('Impossibile caricare gli studenti: ' + st.error.message)
        setLoading(false)
        return
      }
      setStudents((st.data ?? []) as StudentOpt[])

      if (mode === 'create') {
        const preselected = params.get('studente') ?? ''
        const date = params.get('data') ?? todayISO()
        setV({
          student_id: preselected,
          lesson_date: date,
          start_time: '',
          end_time: '',
          subject: '',
          topic: '',
          description: '',
          homework: '',
          status: 'programmata',
          notes: '',
        })
      } else {
        const [l, n] = await Promise.all([
          supabase.from('lessons').select('*').eq('id', id).maybeSingle(),
          supabase.from('lesson_private_notes').select('notes').eq('lesson_id', id).maybeSingle(),
        ])
        if (cancelled) return
        if (l.error || !l.data) {
          setLoadError(l.error ? 'Impossibile caricare la lezione: ' + l.error.message : 'Lezione non trovata.')
          setLoading(false)
          return
        }
        const d = l.data
        setV({
          student_id: d.student_id,
          lesson_date: d.lesson_date,
          start_time: d.start_time ? d.start_time.slice(0, 5) : '',
          end_time: d.end_time ? d.end_time.slice(0, 5) : '',
          subject: d.subject ?? '',
          topic: d.topic ?? '',
          description: d.description ?? '',
          homework: d.homework ?? '',
          status: d.status,
          notes: n.data?.notes ?? '',
        })
      }
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, id])

  if (loading) return <p className="muted">Caricamento…</p>
  if (loadError || !v) {
    return (
      <>
        <Link to="/lezioni" className="back">← Lezioni</Link>
        <p className="error">{loadError}</p>
      </>
    )
  }

  const values = v
  const set =
    (key: keyof Values) =>
    (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setV({ ...values, [key]: e.target.value } as Values)

  const selectedStudent = students.find((s) => s.id === values.student_id)
  const backTo = fromStudent
    ? `/studenti/${fromStudent}?sezione=lezioni`
    : mode === 'edit'
      ? `/studenti/${values.student_id}?sezione=lezioni`
      : '/lezioni'
  const backLabel = backTo === '/lezioni' ? '← Lezioni' : '← Scheda studente'

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!values.student_id) {
      setError('Scegli lo studente.')
      return
    }
    if (values.start_time && values.end_time && values.end_time <= values.start_time) {
      setError('L’orario di fine deve essere successivo a quello di inizio.')
      return
    }
    setBusy(true)
    try {
      const payload = {
        student_id: values.student_id,
        lesson_date: values.lesson_date,
        start_time: values.start_time || null,
        end_time: values.end_time || null,
        subject: values.subject.trim(),
        topic: values.topic.trim() || null,
        description: values.description.trim() || null,
        homework: values.homework.trim() || null,
        status: values.status,
      }
      const details = `${formatDate(values.lesson_date)} · ${payload.subject}`
      if (mode === 'create') {
        const { data, error: err } = await supabase
          .from('lessons')
          .insert(payload)
          .select('id')
          .single()
        if (err) throw new Error(err.message)
        if (values.notes.trim()) {
          const { error: nErr } = await supabase
            .from('lesson_private_notes')
            .insert({ lesson_id: data.id, notes: values.notes })
          if (nErr) throw new Error(nErr.message)
        }
        await logActivity(values.student_id, 'Lezione creata', details)
      } else {
        const { error: err } = await supabase.from('lessons').update(payload).eq('id', id)
        if (err) throw new Error(err.message)
        if (values.notes.trim()) {
          const { error: nErr } = await supabase
            .from('lesson_private_notes')
            .upsert({ lesson_id: id, notes: values.notes })
          if (nErr) throw new Error(nErr.message)
        } else {
          await supabase.from('lesson_private_notes').delete().eq('lesson_id', id)
        }
        await logActivity(values.student_id, 'Lezione modificata', details)
      }
      navigate(backTo)
    } catch (err) {
      setError((err as Error).message)
      setBusy(false)
    }
  }

  async function handleDelete() {
    if (!window.confirm('Eliminare definitivamente questa lezione?')) return
    setBusy(true)
    setError(null)
    const { error: err } = await supabase.from('lessons').delete().eq('id', id)
    if (err) {
      setError('Eliminazione non riuscita: ' + err.message)
      setBusy(false)
      return
    }
    await logActivity(
      values.student_id,
      'Lezione eliminata',
      `${formatDate(values.lesson_date)} · ${values.subject}`,
    )
    navigate(backTo)
  }

  const studentOptions = students.filter((s) => s.active || s.id === values.student_id)

  return (
    <>
      <Link to={backTo} className="back">{backLabel}</Link>
      <h1 className="page-title">{mode === 'create' ? 'Nuova lezione' : 'Modifica lezione'}</h1>
      <form className="panel" onSubmit={handleSubmit}>
        <label htmlFor="student">Studente</label>
        <select
          id="student"
          required
          disabled={mode === 'edit'}
          value={values.student_id}
          onChange={set('student_id')}
        >
          <option value="">Scegli uno studente…</option>
          {studentOptions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.last_name} {s.first_name}
              {s.active ? '' : ' (archiviato)'}
            </option>
          ))}
        </select>

        <div className="form-grid">
          <div>
            <label htmlFor="date">Data</label>
            <input id="date" type="date" required value={values.lesson_date} onChange={set('lesson_date')} />
          </div>
          <div>
            <label htmlFor="status">Stato</label>
            <select id="status" value={values.status} onChange={set('status')}>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{STATUS_LABEL[s]}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="start">Ora di inizio</label>
            <input id="start" type="time" value={values.start_time} onChange={set('start_time')} />
          </div>
          <div>
            <label htmlFor="end">Ora di fine</label>
            <input id="end" type="time" value={values.end_time} onChange={set('end_time')} />
          </div>
          <div>
            <label htmlFor="subject">Materia</label>
            <input
              id="subject"
              required
              list="subject-suggestions"
              value={values.subject}
              onChange={set('subject')}
            />
            <datalist id="subject-suggestions">
              {(selectedStudent?.subjects ?? []).map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </div>
          <div>
            <label htmlFor="topic">Argomento trattato</label>
            <input id="topic" value={values.topic} onChange={set('topic')} />
          </div>
        </div>

        <label htmlFor="description">Descrizione della lezione</label>
        <textarea id="description" rows={3} value={values.description} onChange={set('description')} />

        <label htmlFor="homework">Compiti assegnati</label>
        <textarea id="homework" rows={3} value={values.homework} onChange={set('homework')} />

        <label htmlFor="notes">Annotazioni riservate (lo studente non le vede)</label>
        <textarea id="notes" rows={3} value={values.notes} onChange={set('notes')} />

        {error && <p className="error" role="alert">{error}</p>}

        <button type="submit" className="btn" disabled={busy}>
          {busy ? 'Salvataggio…' : mode === 'create' ? 'Crea lezione' : 'Salva modifiche'}
        </button>
        {mode === 'edit' && (
          <button type="button" className="btn danger" disabled={busy} onClick={handleDelete}>
            Elimina lezione
          </button>
        )}
      </form>
    </>
  )
}
