import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { supabase } from '../lib/supabase'

type Row = {
  id: string
  first_name: string
  last_name: string
  class_name: string | null
  subjects: string[]
}

export default function Students() {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showArchived, setShowArchived] = useState(false)
  const [query, setQuery] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    supabase
      .from('students')
      .select('id, first_name, last_name, class_name, subjects')
      .eq('active', !showArchived)
      .order('last_name')
      .order('first_name')
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) setError('Impossibile caricare gli studenti: ' + error.message)
        else {
          setError(null)
          setRows((data ?? []) as Row[])
        }
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [showArchived])

  const q = query.trim().toLowerCase()
  const visible = q
    ? rows.filter((r) => `${r.first_name} ${r.last_name}`.toLowerCase().includes(q))
    : rows

  return (
    <>
      <div className="page-head">
        <h1 className="page-title">Studenti</h1>
        <Link className="btn inline" to="/studenti/nuovo">
          <Plus size={18} /> Nuovo studente
        </Link>
      </div>

      <div className="toolbar">
        <div className="segmented">
          <button className={!showArchived ? 'on' : ''} onClick={() => setShowArchived(false)}>
            Attivi
          </button>
          <button className={showArchived ? 'on' : ''} onClick={() => setShowArchived(true)}>
            Archiviati
          </button>
        </div>
        <input
          type="search"
          placeholder="Cerca per nome"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Cerca per nome"
        />
      </div>

      {loading ? (
        <p className="muted">Caricamento…</p>
      ) : error ? (
        <p className="error">{error}</p>
      ) : visible.length === 0 ? (
        <div className="panel">
          <p className="empty">
            {rows.length === 0
              ? showArchived
                ? 'Nessuno studente archiviato.'
                : 'Non ci sono ancora studenti. Clicca “Nuovo studente” per aggiungerne uno.'
              : 'Nessun risultato.'}
          </p>
        </div>
      ) : (
        <div className="panel flush">
          <ul className="list links">
            {visible.map((s) => (
              <li key={s.id}>
                <Link to={`/studenti/${s.id}`}>
                  <div className="row-main">
                    {s.last_name} {s.first_name}
                  </div>
                  <div className="row-sub">
                    {[s.class_name, s.subjects.join(', ')].filter(Boolean).join(' · ') || ' '}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  )
}
