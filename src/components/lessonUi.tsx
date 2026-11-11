import { Link } from 'react-router-dom'
import { formatDate, formatTimeRange } from '../lib/format'

export type LessonStatus = 'programmata' | 'svolta' | 'annullata' | 'da_recuperare'

export const STATUS_LABEL: Record<LessonStatus, string> = {
  programmata: 'Programmata',
  svolta: 'Svolta',
  annullata: 'Annullata',
  da_recuperare: 'Da recuperare',
}

export const STATUS_OPTIONS = Object.keys(STATUS_LABEL) as LessonStatus[]

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`status status-${status}`}>
      {STATUS_LABEL[status as LessonStatus] ?? status}
    </span>
  )
}

export type LessonSummary = {
  id: string
  lesson_date: string
  start_time: string | null
  end_time: string | null
  subject: string
  topic: string | null
  status: string
  students?: { first_name: string; last_name: string } | null
}

// Riga cliccabile (solo amministratore): apre la modifica della lezione
export function LessonLink({
  lesson,
  showDate = false,
  showStudent = false,
}: {
  lesson: LessonSummary
  showDate?: boolean
  showStudent?: boolean
}) {
  const studentName = lesson.students
    ? `${lesson.students.first_name} ${lesson.students.last_name}`
    : 'Studente'
  const parts = [
    showDate ? formatDate(lesson.lesson_date) : null,
    formatTimeRange(lesson.start_time, lesson.end_time) || null,
    showStudent ? lesson.subject : null,
    lesson.topic,
  ].filter(Boolean)
  return (
    <Link to={`/lezioni/${lesson.id}`} className="lesson-link">
      <div>
        <div className="row-main">{showStudent ? studentName : lesson.subject}</div>
        <div className="row-sub">{parts.join(' · ') || ' '}</div>
      </div>
      <StatusBadge status={lesson.status} />
    </Link>
  )
}
