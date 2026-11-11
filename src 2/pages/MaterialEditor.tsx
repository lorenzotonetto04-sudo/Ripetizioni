import { useEffect, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { formatDate } from '../lib/format'
import { logActivity } from '../lib/adminApi'
import { MAX_FILE_MB, removeFile, safeFileName, uploadFile } from '../lib/files'
import { FileActions } from '../components/materialUi'

type StudentOpt = {
  id: string
  first_name: string
  last_name: string
  subjects: string[]
  active: boolean
}
type LessonOpt = { id: string; lesson_date: string; subject: string; topic: string | null }

type Values = {
  student_id: string
  lesson_id: string
  title: string
  description: string
  subject: string
  topic: string
}

export default function MaterialEditor({ mode }: { mode: 'create' | 'edit' }) {
  const { id } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()

  const [students, setStudents] = useState<StudentOpt[]>([])
  const [lessons, setLessons] = useState<LessonOpt[]>([])
  const [v, setV] = useState<Values | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [current, setCurrent] = useState<{ path: string; name: string } | null>(null)
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
        setV({
          student_id: params.get('studente') ?? '',
          lesson_id: '',
          title: '',
          description: '',
          subject: '',
          topic: '',
        })
      } else {
        const m = await supabase.from('materials').select('*').eq('id', id).maybeSingle()
        if (cancelled) return
        if (m.error || !m.data) {
          setLoadError(m.error ? 'Impossibile caricare il materiale: ' + m.error.message : 'Materiale non trovato.')
          setLoading(false)
          return
        }
        const d = m.data
        setCurrent({ path: d.file_path, name: d.file_name })
        setV({
          student_id: d.student_id,
          lesson_id: d.lesson_id ?? '',
          title: d.title,
          description: d.description ?? '',
          subject: d.subject ?? '',
          topic: d.topic ?? '',
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

  // Lezioni dello studente scelto (per il collegamento facoltativo)
  const studentId = v?.student_id
  useEffect(() => {
    if (!studentId) {
      setLessons([])
      return
    }
    let cancelled = false
    supabase
      .from('lessons')
      .select('id, lesson_date, subject, topic')
      .eq('student_id', studentId)
      .order('lesson_date', { ascending: false })
      .limit(100)
      .then(({ data }) => {
        if (!cancelled) setLessons((data ?? []) as LessonOpt[])
      })
    return () => {
      cancelled = true
    }
  }, [studentId])

  if (loading) return <p className="muted">Caricamento…</p>
  if (loadError || !v) {
    return (
      <>
        <Link to="/materiali" className="back">← Materiali</Link>
        <p className="error">{loadError}</p>
      </>
    )
  }

  const values = v
  const set =
    (key: keyof Values) =>
    (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const next = { ...values, [key]: e.target.value } as Values
      if (key === 'student_id') next.lesson_id = ''
      setV(next)
    }

  const selectedStudent = students.find((s) => s.id === values.student_id)
  const backTo = fromStudent
    ? `/studenti/${fromStudent}?sezione=materiali`
    : mode === 'edit'
      ? `/studenti/${values.student_id}?sezione=materiali`
      : '/materiali'
  const backLabel = backTo === '/materiali' ? '← Materiali' : '← Scheda studente'

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!values.student_id) {
      setError('Scegli lo studente.')
      return
    }
    if (mode === 'create') {
      if (!file) {
        setError('Scegli il file da caricare.')
        return
      }
      if (file.size > MAX_FILE_MB * 1024 * 1024) {
        setError(`Il file supera i ${MAX_FILE_MB} MB.`)
        return
      }
    }
    setBusy(true)
    let uploadedPath: string | null = null
    try {
      const meta = {
        lesson_id: values.lesson_id || null,
        title: values.title.trim(),
        description: values.description.trim() || null,
        subject: values.subject.trim() || null,
        topic: values.topic.trim() || null,
      }
      if (mode === 'create' && file) {
        // Percorso: <id-studente>/<codice>-<nome>. Lo studente legge solo la propria cartella.
        const path = `${values.student_id}/${crypto.randomUUID()}-${safeFileName(file.name)}`
        await uploadFile(path, file)
        uploadedPath = path
        const { error: err } = await supabase.from('materials').insert({
          ...meta,
          student_id: values.student_id,
          file_path: path,
          file_name: file.name,
        })
        if (err) throw new Error(err.message)
        await logActivity(values.student_id, 'Materiale caricato', meta.title)
      } else {
        const { error: err } = await supabase.from('materials').update(meta).eq('id', id)
        if (err) throw new Error(err.message)
        await logActivity(values.student_id, 'Materiale modificato', meta.title)
      }
      navigate(backTo)
    } catch (err) {
      // Se il file è stato caricato ma il salvataggio è fallito, lo si toglie
      if (uploadedPath) await removeFile(uploadedPath)
      setError((err as Error).message)
      setBusy(false)
    }
  }

  async function handleDelete() {
    if (!current) return
    if (!window.confirm('Eliminare definitivamente questo materiale e il suo file?')) return
    setBusy(true)
    setError(null)
    const { error: err } = await supabase.from('materials').delete().eq('id', id)
    if (err) {
      setError('Eliminazione non riuscita: ' + err.message)
      setBusy(false)
      return
    }
    await removeFile(current.path)
    await logActivity(values.student_id, 'Materiale eliminato', values.title)
    navigate(backTo)
  }

  const studentOptions = students.filter((s) => s.active || s.id === values.student_id)

  return (
    <>
      <Link to={backTo} className="back">{backLabel}</Link>
      <h1 className="page-title">{mode === 'create' ? 'Carica materiale' : 'Modifica materiale'}</h1>
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

        {mode === 'create' ? (
          <>
            <label htmlFor="file">File (PDF, Word, presentazioni, immagini… massimo {MAX_FILE_MB} MB)</label>
            <input
              id="file"
              type="file"
              required
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null
                setFile(f)
                if (f && !values.title) setV({ ...values, title: f.name.replace(/\.[^.]+$/, '') })
              }}
            />
          </>
        ) : (
          current && (
            <>
              <label>File</label>
              <p className="row-sub file-name">{current.name}</p>
              <FileActions path={current.path} fileName={current.name} />
            </>
          )
        )}

        <label htmlFor="title">Titolo del documento</label>
        <input id="title" required value={values.title} onChange={set('title')} />

        <label htmlFor="description">Descrizione</label>
        <textarea id="description" rows={3} value={values.description} onChange={set('description')} />

        <div className="form-grid">
          <div>
            <label htmlFor="subject">Materia</label>
            <input
              id="subject"
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
            <label htmlFor="topic">Argomento</label>
            <input id="topic" value={values.topic} onChange={set('topic')} />
          </div>
        </div>

        <label htmlFor="lesson">Lezione collegata (facoltativa)</label>
        <select id="lesson" value={values.lesson_id} onChange={set('lesson_id')}>
          <option value="">Nessuna</option>
          {lessons.map((l) => (
            <option key={l.id} value={l.id}>
              {formatDate(l.lesson_date)} · {l.subject}
              {l.topic ? ` · ${l.topic}` : ''}
            </option>
          ))}
        </select>

        {error && <p className="error" role="alert">{error}</p>}

        <button type="submit" className="btn" disabled={busy}>
          {busy ? 'Salvataggio…' : mode === 'create' ? 'Carica' : 'Salva modifiche'}
        </button>
        {mode === 'edit' && (
          <button type="button" className="btn danger" disabled={busy} onClick={handleDelete}>
            Elimina materiale
          </button>
        )}
      </form>
    </>
  )
}
