import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { LessonLink } from './lessonUi'
import type { LessonSummary } from './lessonUi'

export default function StudentLessonsTab({ studentId }: { studentId: string }) {
  const [lessons, setLessons] = useState<LessonSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    supabase
      .from('lessons')
      .select('id, lesson_date, start_time, end_time, subject, topic, status')
      .eq('student_id', studentId)
      .order('lesson_date', { ascending: false })
      .order('start_time', { ascending: false })
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) setError('Impossibile caricare le lezioni: ' + error.message)
        else setLessons((data ?? []) as LessonSummary[])
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [studentId])

  return (
    <>
      <div className="page-head">
        <h2>Lezioni</h2>
        <Link className="btn inline" to={`/lezioni/nuova?studente=${studentId}`}>
          <Plus size={18} /> Nuova lezione
        </Link>
      </div>
      {loading ? (
        <p className="muted">Caricamento…</p>
      ) : error ? (
        <p className="error">{error}</p>
      ) : lessons.length === 0 ? (
        <div className="panel">
          <p className="empty">Nessuna lezione per questo studente.</p>
        </div>
      ) : (
        <div className="panel flush">
          <ul className="list links">
            {lessons.map((l) => (
              <li key={l.id}>
                <LessonLink lesson={l} showDate />
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  )
}
