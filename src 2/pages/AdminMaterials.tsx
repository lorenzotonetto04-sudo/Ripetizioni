import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { MaterialLink } from '../components/materialUi'
import type { MaterialSummary } from '../components/materialUi'

export default function AdminMaterials() {
  const [items, setItems] = useState<MaterialSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [studentFilter, setStudentFilter] = useState('')
  const [subjectFilter, setSubjectFilter] = useState('')
  const [query, setQuery] = useState('')

  useEffect(() => {
    let cancelled = false
    supabase
      .from('materials')
      .select('id, student_id, title, subject, topic, file_name, created_at, students(first_name, last_name)')
      .order('created_at', { ascending: false })
      .limit(300)
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) setError('Impossibile caricare i materiali: ' + error.message)
        else setItems((data ?? []) as unknown as MaterialSummary[])
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const students = new Map<string, string>()
  const subjects = new Set<string>()
  for (const m of items) {
    if (m.students) students.set(m.student_id, `${m.students.last_name} ${m.students.first_name}`)
    if (m.subject) subjects.add(m.subject)
  }

  const q = query.trim().toLowerCase()
  const visible = items.filter((m) => {
    if (studentFilter && m.student_id !== studentFilter) return false
    if (subjectFilter && m.subject !== subjectFilter) return false
    if (q && !m.title.toLowerCase().includes(q)) return false
    return true
  })

  return (
    <>
      <div className="page-head">
        <h1 className="page-title">Materiali</h1>
        <Link className="btn inline" to="/materiali/nuovo">
          <Plus size={18} /> Carica materiale
        </Link>
      </div>

      <div className="toolbar">
        <select
          aria-label="Filtra per studente"
          value={studentFilter}
          onChange={(e) => setStudentFilter(e.target.value)}
        >
          <option value="">Tutti gli studenti</option>
          {[...students.entries()]
            .sort((a, b) => a[1].localeCompare(b[1], 'it'))
            .map(([id, name]) => (
              <option key={id} value={id}>{name}</option>
            ))}
        </select>
        <select
          aria-label="Filtra per materia"
          value={subjectFilter}
          onChange={(e) => setSubjectFilter(e.target.value)}
        >
          <option value="">Tutte le materie</option>
          {[...subjects].sort((a, b) => a.localeCompare(b, 'it')).map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <input
          type="search"
          placeholder="Cerca per titolo"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Cerca per titolo"
        />
      </div>

      {loading ? (
        <p className="muted">Caricamento…</p>
      ) : error ? (
        <p className="error">{error}</p>
      ) : visible.length === 0 ? (
        <div className="panel">
          <p className="empty">
            {items.length === 0
              ? 'Non hai ancora caricato materiale. Clicca “Carica materiale”.'
              : 'Nessun materiale trovato.'}
          </p>
        </div>
      ) : (
        <div className="panel flush">
          <ul className="list links">
            {visible.map((m) => (
              <li key={m.id}>
                <MaterialLink material={m} showStudent />
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  )
}
