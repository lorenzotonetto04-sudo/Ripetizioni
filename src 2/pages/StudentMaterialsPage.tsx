import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { FileActions, shortDate } from '../components/materialUi'
import { fileExt } from '../lib/files'

type Material = {
  id: string
  title: string
  description: string | null
  subject: string | null
  topic: string | null
  file_path: string
  file_name: string
  created_at: string
}

export default function StudentMaterialsPage() {
  const [items, setItems] = useState<Material[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    // Il database restituisce solo i materiali destinati a questo studente
    supabase
      .from('materials')
      .select('id, title, description, subject, topic, file_path, file_name, created_at')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) setError('Impossibile caricare i materiali: ' + error.message)
        else setItems((data ?? []) as Material[])
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) return <p className="muted">Caricamento…</p>
  if (error) return <p className="error">{error}</p>

  // Raggruppa per materia ("Altro" in fondo), poi per argomento
  const groups = new Map<string, Material[]>()
  for (const m of items) {
    const key = m.subject?.trim() || 'Altro'
    groups.set(key, [...(groups.get(key) ?? []), m])
  }
  const keys = [...groups.keys()].sort((a, b) => {
    if (a === 'Altro') return 1
    if (b === 'Altro') return -1
    return a.localeCompare(b, 'it')
  })
  for (const k of keys) {
    groups.get(k)!.sort((a, b) => {
      const ta = a.topic ?? '\uffff'
      const tb = b.topic ?? '\uffff'
      return ta === tb ? b.created_at.localeCompare(a.created_at) : ta.localeCompare(tb, 'it')
    })
  }

  return (
    <>
      <h1 className="page-title">Materiale didattico</h1>
      {items.length === 0 ? (
        <div className="panel">
          <p className="empty">Non ci sono ancora materiali.</p>
        </div>
      ) : (
        keys.map((k) => (
          <section key={k} className="subject-group">
            <h2>{k}</h2>
            <div className="stack">
              {groups.get(k)!.map((m) => (
                <article key={m.id} className="panel">
                  <div className="lesson-card-head">
                    <div>
                      <div className="row-main">{m.title}</div>
                      <div className="row-sub">
                        {[m.topic, shortDate(m.created_at)].filter(Boolean).join(' · ')}
                      </div>
                    </div>
                    <span className="file-ext">{fileExt(m.file_name)}</span>
                  </div>
                  {m.description && <p className="material-desc">{m.description}</p>}
                  <FileActions path={m.file_path} fileName={m.file_name} />
                </article>
              ))}
            </div>
          </section>
        ))
      )}
    </>
  )
}
