import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import StudentForm, { emptyStudent } from '../components/StudentForm'
import type { StudentValues } from '../components/StudentForm'
import { callAdminFunction, parseSubjects } from '../lib/adminApi'

export default function StudentNew() {
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [created, setCreated] = useState<{ id: string; email: string; password: string } | null>(null)

  async function handleCreate(v: StudentValues) {
    setBusy(true)
    setError(null)
    try {
      const data = await callAdminFunction({
        action: 'create',
        first_name: v.first_name,
        last_name: v.last_name,
        email: v.email,
        phone: v.phone,
        class_name: v.class_name,
        school: v.school,
        subjects: parseSubjects(v.subjects),
        start_date: v.start_date,
        notes: v.notes,
        password: v.password,
      })
      setCreated({ id: data.id, email: v.email.trim().toLowerCase(), password: v.password })
    } catch (e) {
      setError((e as Error).message)
    }
    setBusy(false)
  }

  if (created) {
    return (
      <>
        <h1 className="page-title">Studente creato</h1>
        <div className="panel">
          <p>Comunica allo studente queste credenziali di accesso:</p>
          <div className="credentials">
            <div><span className="muted">Email</span><strong>{created.email}</strong></div>
            <div><span className="muted">Password</span><strong>{created.password}</strong></div>
          </div>
          <p className="muted">
            Annotale adesso: la password non sarà più visibile. Se la perdi, potrai
            impostarne una nuova dalla scheda dello studente.
          </p>
          <button className="btn" onClick={() => navigate(`/studenti/${created.id}`)}>
            Vai alla scheda dello studente
          </button>
        </div>
      </>
    )
  }

  return (
    <>
      <Link to="/studenti" className="back">← Studenti</Link>
      <h1 className="page-title">Nuovo studente</h1>
      <div className="panel">
        <StudentForm
          mode="create"
          initial={emptyStudent}
          busy={busy}
          error={error}
          submitLabel="Crea studente"
          onSubmit={handleCreate}
        />
      </div>
    </>
  )
}
