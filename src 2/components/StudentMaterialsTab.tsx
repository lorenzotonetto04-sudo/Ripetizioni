import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { MaterialLink } from './materialUi'
import type { MaterialSummary } from './materialUi'

export default function StudentMaterialsTab({ studentId }: { studentId: string }) {
  const [items, setItems] = useState<MaterialSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    supabase
      .from('materials')
      .select('id, student_id, title, subject, topic, file_name, created_at')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) setError('Impossibile caricare i materiali: ' + error.message)
        else setItems((data ?? []) as MaterialSummary[])
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [studentId])

  return (
    <>
      <div className="page-head">
        <h2>Materiale didattico</h2>
        <Link className="btn inline" to={`/materiali/nuovo?studente=${studentId}`}>
          <Plus size={18} /> Carica materiale
        </Link>
      </div>
      {loading ? (
        <p className="muted">Caricamento…</p>
      ) : error ? (
        <p className="error">{error}</p>
      ) : items.length === 0 ? (
        <div className="panel">
          <p className="empty">Nessun materiale per questo studente.</p>
        </div>
      ) : (
        <div className="panel flush">
          <ul className="list links">
            {items.map((m) => (
              <li key={m.id}>
                <MaterialLink material={m} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  )
}
