import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { todayISO, formatDate, formatTimeRange, formatDateTime } from '../lib/format'

type LessonRow = {
  id: string
  lesson_date: string
  start_time: string | null
  end_time: string | null
  subject: string
  topic: string | null
  students: { first_name: string; last_name: string } | null
}

type ActivityRow = {
  id: number
  created_at: string
  action: string
  details: string | null
}

const LESSON_COLUMNS =
  'id, lesson_date, start_time, end_time, subject, topic, students(first_name, last_name)'

function LessonList({ lessons, empty }: { lessons: LessonRow[]; empty: string }) {
  if (lessons.length === 0) return <p className="empty">{empty}</p>
  return (
    <ul className="list">
      {lessons.map((l) => (
        <li key={l.id}>
          <div className="row-main">
            {l.students ? `${l.students.first_name} ${l.students.last_name}` : 'Studente'}
          </div>
          <div className="row-sub">
            {formatDate(l.lesson_date)}
            {l.start_time ? ` · ${formatTimeRange(l.start_time, l.end_time)}` : ''}
            {` · ${l.subject}`}
            {l.topic ? ` · ${l.topic}` : ''}
          </div>
        </li>
      ))}
    </ul>
  )
}

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeCount, setActiveCount] = useState(0)
  const [upcoming, setUpcoming] = useState<LessonRow[]>([])
  const [done, setDone] = useState<LessonRow[]>([])
  const [activity, setActivity] = useState<ActivityRow[]>([])

  useEffect(() => {
    let cancelled = false
    async function load() {
      const today = todayISO()
      const [a, u, d, l] = await Promise.all([
        supabase.from('students').select('id', { count: 'exact', head: true }).eq('active', true),
        supabase
          .from('lessons')
          .select(LESSON_COLUMNS)
          .eq('status', 'programmata')
          .gte('lesson_date', today)
          .order('lesson_date')
          .order('start_time')
          .limit(5),
        supabase
          .from('lessons')
          .select(LESSON_COLUMNS)
          .eq('status', 'svolta')
          .order('lesson_date', { ascending: false })
          .limit(5),
        supabase
          .from('activity_log')
          .select('id, created_at, action, details')
          .order('created_at', { ascending: false })
          .limit(5),
      ])
      if (cancelled) return
      const firstError = a.error || u.error || d.error || l.error
      if (firstError) {
        setError('Impossibile caricare i dati: ' + firstError.message)
      } else {
        setActiveCount(a.count ?? 0)
        setUpcoming((u.data ?? []) as unknown as LessonRow[])
        setDone((d.data ?? []) as unknown as LessonRow[])
        setActivity((l.data ?? []) as ActivityRow[])
      }
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) return <p className="muted">Caricamento…</p>
  if (error) return <p className="error">{error}</p>

  return (
    <>
      <h1 className="page-title">Dashboard</h1>
      <div className="grid">
        <section className="panel stat">
          <div className="stat-number">{activeCount}</div>
          <div className="muted">Studenti attivi</div>
        </section>

        <section className="panel">
          <h2>Prossime lezioni</h2>
          <LessonList lessons={upcoming} empty="Nessuna lezione in programma." />
        </section>

        <section className="panel">
          <h2>Ultime lezioni svolte</h2>
          <LessonList lessons={done} empty="Nessuna lezione svolta." />
        </section>

        <section className="panel">
          <h2>Attività recenti</h2>
          {activity.length === 0 ? (
            <p className="empty">Nessuna attività registrata.</p>
          ) : (
            <ul className="list">
              {activity.map((a) => (
                <li key={a.id}>
                  <div className="row-main">{a.action}</div>
                  <div className="row-sub">
                    {formatDateTime(a.created_at)}
                    {a.details ? ` · ${a.details}` : ''}
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
