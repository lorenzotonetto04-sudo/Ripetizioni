import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { todayISO, formatDate, formatTimeRange } from '../lib/format'
import { StatusBadge } from '../components/lessonUi'

type Lesson = {
  id: string
  lesson_date: string
  start_time: string | null
  end_time: string | null
  subject: string
  topic: string | null
  description: string | null
  homework: string | null
  status: string
}

function LessonCard({ l }: { l: Lesson }) {
  return (
    <article className="panel lesson-card">
      <div className="lesson-card-head">
        <div>
          <div className="row-main">{formatDate(l.lesson_date)}</div>
          <div className="row-sub">
            {[formatTimeRange(l.start_time, l.end_time), l.subject].filter(Boolean).join(' · ')}
          </div>
        </div>
        <StatusBadge status={l.status} />
      </div>
      {l.topic && (
        <p className="lesson-topic">
          <span className="muted">Argomento</span>
          <strong>{l.topic}</strong>
        </p>
      )}
      {l.description && <p>{l.description}</p>}
      {l.homework && (
        <div className="homework">
          <span className="muted">Compiti</span>
          <p>{l.homework}</p>
        </div>
      )}
    </article>
  )
}

export default function StudentLessonsPage() {
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    // Le regole del database restituiscono comunque solo le lezioni di questo studente.
    // Le annotazioni riservate stanno in un'altra tabella e non vengono mai lette qui.
    supabase
      .from('lessons')
      .select('id, lesson_date, start_time, end_time, subject, topic, description, homework, status')
      .order('lesson_date', { ascending: false })
      .order('start_time', { ascending: false })
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) setError('Impossibile caricare le lezioni: ' + error.message)
        else setLessons((data ?? []) as Lesson[])
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) return <p className="muted">Caricamento…</p>
  if (error) return <p className="error">{error}</p>

  const today = todayISO()
  const upcoming = lessons
    .filter((l) => l.status === 'programmata' && l.lesson_date >= today)
    .reverse()
  const past = lessons.filter((l) => !upcoming.includes(l))

  return (
    <>
      <h1 className="page-title">Lezioni</h1>
      <h2>Prossime</h2>
      {upcoming.length === 0 ? (
        <div className="panel">
          <p className="empty">Nessuna lezione in programma.</p>
        </div>
      ) : (
        <div className="stack">{upcoming.map((l) => <LessonCard key={l.id} l={l} />)}</div>
      )}
      <h2 className="section-gap">Storico</h2>
      {past.length === 0 ? (
        <div className="panel">
          <p className="empty">Non ci sono ancora lezioni.</p>
        </div>
      ) : (
        <div className="stack">{past.map((l) => <LessonCard key={l.id} l={l} />)}</div>
      )}
    </>
  )
}
