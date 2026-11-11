import { useState } from 'react'
import { Link } from 'react-router-dom'
import { formatDate } from '../lib/format'
import { downloadFile, fileExt, openFile } from '../lib/files'

export type MaterialSummary = {
  id: string
  student_id: string
  title: string
  subject: string | null
  topic: string | null
  file_name: string
  created_at: string
  students?: { first_name: string; last_name: string } | null
}

export function shortDate(iso: string): string {
  return formatDate(iso.slice(0, 10))
}

// Riga cliccabile (solo amministratore): apre la modifica del materiale
export function MaterialLink({
  material,
  showStudent = false,
}: {
  material: MaterialSummary
  showStudent?: boolean
}) {
  const studentName = material.students
    ? `${material.students.first_name} ${material.students.last_name}`
    : null
  const parts = [
    showStudent ? studentName : null,
    material.subject,
    material.topic,
    shortDate(material.created_at),
  ].filter(Boolean)
  return (
    <Link to={`/materiali/${material.id}`} className="lesson-link">
      <div>
        <div className="row-main">{material.title}</div>
        <div className="row-sub">{parts.join(' · ')}</div>
      </div>
      <span className="file-ext">{fileExt(material.file_name)}</span>
    </Link>
  )
}

// Pulsanti "Apri" e "Scarica"
export function FileActions({ path, fileName }: { path: string; fileName: string }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function run(fn: () => Promise<void>) {
    setBusy(true)
    setError(null)
    try {
      await fn()
    } catch (e) {
      setError((e as Error).message)
    }
    setBusy(false)
  }

  return (
    <div>
      <div className="material-actions">
        <button
          type="button"
          className="btn secondary inline"
          disabled={busy}
          onClick={() => run(() => openFile(path))}
        >
          Apri
        </button>
        <button
          type="button"
          className="btn inline"
          disabled={busy}
          onClick={() => run(() => downloadFile(path, fileName))}
        >
          Scarica
        </button>
      </div>
      {error && <p className="error">{error}</p>}
    </div>
  )
}
