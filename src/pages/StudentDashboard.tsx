import { useEffect, useState } from 'react'
import { useAuth } from '../auth'
import { supabase } from '../lib/supabase'
import {
  todayISO,
  formatDate,
  formatTimeRange,
  formatGrade,
  KIND_LABEL,
} from '../lib/format'

type NextLesson = {
  lesson_date: string
  start_time: string | null
  end_time: string | null
  subject: string
  topic: string | null
}
type GradeRow = {
  id: string
  grade_date: string
  subject: string
  kind: string
  grade: number | string
  comment: string | null
}
type MaterialRow = {
  id: string
  title: string
  subject: string | null
  created_at: string
}

export default function StudentDashboard() {
  const { profile } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [next, setNext] = useState<NextLesson | null>(null)
  const [grades, setGrades] = useState<GradeRow[]>([])
  const [materials, setMaterials] = useState<MaterialRow[]>([])

  useEffect(() => {
    let cancelled = false
    async function load() {
      // Le regole del database restituiscono comunque SOLO i dati di questo studente
      const [n, g, m] = await Promise.all([
        supabase
          .from('lessons')
          .select('lesson_date, start_time, end_time, subject, topic')
          .eq('status', 'programmata')
          .gte('lesson_date', todayISO())
          .order('lesson_date')
          .order('start_time')
          .limit(1),
        supabase
          .from('grades')
          .select('id, grade_date, subject, kind, grade, comment')
          .order('grade_date', { ascending: false })
          .limit(5),
        supabase
          .from('materials')
          .select('id, title, subject, created_at')
          .order('created_at', { ascending: false })
          .limit(5),
      ])
      if (cancelled) return
      const firstError = n.error || g.error || m.error
      if (firstError) {
        setError('Impossibile caricare i dati: ' + firstError.message)
      } else {
        setNext(((n.data ?? [])[0] as NextLesson | undefined) ?? null)
        setGrades((g.data ?? []) as GradeRow[])
        setMaterials((m.data ?? []) as MaterialRow[])
      }
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const firstName = (profile?.full_name ?? '').split(' ')[0]

  if (loading) return <p className="muted">Caricamento…</p>
  if (error) return <p className="error">{error}</p>

  return (
    <>
      <h1 className="page-title">Ciao{firstName ? ', ' + firstName : ''}</h1>
      <div className="grid">
        <section className="panel">
          <h2>Prossima lezione</h2>
          {next ? (
            <>
              <div className="row-main">{formatDate(next.lesson_date)}</div>
              <div className="row-sub">
                {next.start_time ? formatTimeRange(next.start_time, next.end_time) + ' · ' : ''}
                {next.subject}
                {next.topic ? ` · ${next.topic}` : ''}
              </div>
            </>
          ) : (
            <p className="empty">Nessuna lezione in programma.</p>
          )}
        </section>

        <section className="panel">
          <h2>Ultimi voti</h2>
          {grades.length === 0 ? (
            <p className="empty">Non ci sono ancora voti.</p>
          ) : (
            <ul className="list">
              {grades.map((g) => (
                <li key={g.id} className="with-badge">
                  <div>
                    <div className="row-main">{g.subject}</div>
                    <div className="row-sub">
                      {formatDate(g.grade_date)} · {KIND_LABEL[g.kind] ?? g.kind}
                    </div>
                    {g.comment && <div className="row-sub">{g.comment}</div>}
                  </div>
                  <span className="grade">{formatGrade(g.grade)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="panel">
          <h2>Nuovi materiali</h2>
          {materials.length === 0 ? (
            <p className="empty">Non ci sono ancora materiali.</p>
          ) : (
            <ul className="list">
              {materials.map((mat) => (
                <li key={mat.id}>
                  <div className="row-main">{mat.title}</div>
                  <div className="row-sub">
                    {mat.subject ? `${mat.subject} · ` : ''}
                    {new Date(mat.created_at).toLocaleDateString('it-IT', {
                      day: 'numeric',
                      month: 'long',
                    })}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  )
}
