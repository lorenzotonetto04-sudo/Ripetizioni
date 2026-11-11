import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { todayISO, formatDate } from '../lib/format'
import { LessonLink, STATUS_LABEL, STATUS_OPTIONS } from '../components/lessonUi'
import type { LessonStatus, LessonSummary } from '../components/lessonUi'

const COLUMNS =
  'id, lesson_date, start_time, end_time, subject, topic, status, students(first_name, last_name)'

const pad = (n: number) => String(n).padStart(2, '0')
const isoOf = (y: number, m0: number, d: number) => `${y}-${pad(m0 + 1)}-${pad(d)}`
const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']

function CalendarView() {
  const today = todayISO()
  const [cursor, setCursor] = useState(() => {
    const d = new Date()
    return { y: d.getFullYear(), m: d.getMonth() }
  })
  const [selected, setSelected] = useState(today)
  const [lessons, setLessons] = useState<LessonSummary[]>([])
  const [error, setError] = useState<string | null>(null)

  const daysInMonth = new Date(cursor.y, cursor.m + 1, 0).getDate()
  const lead = (new Date(cursor.y, cursor.m, 1).getDay() + 6) % 7 // lunedì = 0

  useEffect(() => {
    let cancelled = false
    supabase
      .from('lessons')
      .select(COLUMNS)
      .gte('lesson_date', isoOf(cursor.y, cursor.m, 1))
      .lte('lesson_date', isoOf(cursor.y, cursor.m, daysInMonth))
      .order('lesson_date')
      .order('start_time')
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) setError('Impossibile caricare le lezioni: ' + error.message)
        else {
          setError(null)
          setLessons((data ?? []) as unknown as LessonSummary[])
        }
      })
    return () => {
      cancelled = true
    }
  }, [cursor, daysInMonth])

  const byDay = useMemo(() => {
    const map = new Map<string, LessonSummary[]>()
    for (const l of lessons) {
      const list = map.get(l.lesson_date) ?? []
      list.push(l)
      map.set(l.lesson_date, list)
    }
    return map
  }, [lessons])

  function changeMonth(delta: number) {
    const d = new Date(cursor.y, cursor.m + delta, 1)
    const next = { y: d.getFullYear(), m: d.getMonth() }
    setCursor(next)
    const t = new Date()
    const isCurrent = t.getFullYear() === next.y && t.getMonth() === next.m
    setSelected(isCurrent ? today : isoOf(next.y, next.m, 1))
  }

  const title = new Date(cursor.y, cursor.m, 1).toLocaleDateString('it-IT', {
    month: 'long',
    year: 'numeric',
  })
  const dayLessons = byDay.get(selected) ?? []

  return (
    <>
      <div className="panel">
        <div className="cal-head">
          <button className="icon-btn" aria-label="Mese precedente" onClick={() => changeMonth(-1)}>
            <ChevronLeft size={22} />
          </button>
          <strong className="cal-title">{title}</strong>
          <button className="icon-btn" aria-label="Mese successivo" onClick={() => changeMonth(1)}>
            <ChevronRight size={22} />
          </button>
        </div>
        <div className="cal-grid">
          {WEEKDAYS.map((w) => (
            <div key={w} className="cal-dow">{w}</div>
          ))}
          {Array.from({ length: lead }, (_, i) => (
            <div key={'b' + i} />
          ))}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1
            const iso = isoOf(cursor.y, cursor.m, day)
            const count = byDay.get(iso)?.length ?? 0
            const cls =
              'cal-day' +
              (iso === today ? ' today' : '') +
              (iso === selected ? ' selected' : '')
            return (
              <button
                key={iso}
                className={cls}
                onClick={() => setSelected(iso)}
                aria-label={`${formatDate(iso)}${count ? `, ${count} lezioni` : ''}`}
              >
                <span>{day}</span>
                {count > 0 && <span className="cal-count">{count}</span>}
              </button>
            )
          })}
        </div>
        {error && <p className="error">{error}</p>}
      </div>

      <div className="page-head day-head">
        <h2>{formatDate(selected)}</h2>
        <Link className="btn secondary inline" to={`/lezioni/nuova?data=${selected}`}>
          <Plus size={18} /> Aggiungi
        </Link>
      </div>
      {dayLessons.length === 0 ? (
        <div className="panel">
          <p className="empty">Nessuna lezione in questa giornata.</p>
        </div>
      ) : (
        <div className="panel flush">
          <ul className="list links">
            {dayLessons.map((l) => (
              <li key={l.id}>
                <LessonLink lesson={l} showStudent />
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  )
}

function HistoryView() {
  const [lessons, setLessons] = useState<LessonSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<'tutte' | LessonStatus>('tutte')
  const [query, setQuery] = useState('')

  useEffect(() => {
    let cancelled = false
    supabase
      .from('lessons')
      .select(COLUMNS)
      .order('lesson_date', { ascending: false })
      .order('start_time', { ascending: false })
      .limit(300)
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) setError('Impossibile caricare le lezioni: ' + error.message)
        else setLessons((data ?? []) as unknown as LessonSummary[])
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const q = query.trim().toLowerCase()
  const visible = lessons.filter((l) => {
    if (status !== 'tutte' && l.status !== status) return false
    if (!q) return true
    const name = l.students ? `${l.students.first_name} ${l.students.last_name}` : ''
    return name.toLowerCase().includes(q)
  })

  return (
    <>
      <div className="toolbar">
        <select
          aria-label="Filtra per stato"
          value={status}
          onChange={(e) => setStatus(e.target.value as 'tutte' | LessonStatus)}
        >
          <option value="tutte">Tutti gli stati</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{STATUS_LABEL[s]}</option>
          ))}
        </select>
        <input
          type="search"
          placeholder="Cerca per studente"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Cerca per studente"
        />
      </div>
      {loading ? (
        <p className="muted">Caricamento…</p>
      ) : error ? (
        <p className="error">{error}</p>
      ) : visible.length === 0 ? (
        <div className="panel">
          <p className="empty">Nessuna lezione trovata.</p>
        </div>
      ) : (
        <div className="panel flush">
          <ul className="list links">
            {visible.map((l) => (
              <li key={l.id}>
                <LessonLink lesson={l} showDate showStudent />
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  )
}

export default function AdminLessons() {
  const [view, setView] = useState<'calendario' | 'storico'>('calendario')
  return (
    <>
      <div className="page-head">
        <h1 className="page-title">Lezioni</h1>
        <Link className="btn inline" to="/lezioni/nuova">
          <Plus size={18} /> Nuova lezione
        </Link>
      </div>
      <div className="toolbar">
        <div className="segmented">
          <button className={view === 'calendario' ? 'on' : ''} onClick={() => setView('calendario')}>
            Calendario
          </button>
          <button className={view === 'storico' ? 'on' : ''} onClick={() => setView('storico')}>
            Storico
          </button>
        </div>
      </div>
      {view === 'calendario' ? <CalendarView /> : <HistoryView />}
    </>
  )
}
