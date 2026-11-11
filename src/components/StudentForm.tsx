import { useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { generatePassword } from '../lib/adminApi'

export type StudentValues = {
  first_name: string
  last_name: string
  email: string
  phone: string
  class_name: string
  school: string
  subjects: string
  start_date: string
  notes: string
  password: string
}

export const emptyStudent: StudentValues = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  class_name: '',
  school: '',
  subjects: '',
  start_date: '',
  notes: '',
  password: '',
}

type Props = {
  mode: 'create' | 'edit'
  initial: StudentValues
  busy: boolean
  error: string | null
  submitLabel: string
  onSubmit: (values: StudentValues) => void
}

export default function StudentForm({ mode, initial, busy, error, submitLabel, onSubmit }: Props) {
  const [v, setV] = useState<StudentValues>(initial)

  const set =
    (key: keyof StudentValues) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setV({ ...v, [key]: e.target.value })

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    onSubmit(v)
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-grid">
        <div>
          <label htmlFor="first_name">Nome</label>
          <input id="first_name" required value={v.first_name} onChange={set('first_name')} />
        </div>
        <div>
          <label htmlFor="last_name">Cognome</label>
          <input id="last_name" required value={v.last_name} onChange={set('last_name')} />
        </div>
        <div>
          <label htmlFor="s_email">Email (serve per l’accesso)</label>
          <input
            id="s_email"
            type="email"
            required
            autoCapitalize="none"
            value={v.email}
            onChange={set('email')}
          />
        </div>
        <div>
          <label htmlFor="phone">Telefono (facoltativo)</label>
          <input id="phone" type="tel" value={v.phone} onChange={set('phone')} />
        </div>
        <div>
          <label htmlFor="class_name">Classe frequentata</label>
          <input
            id="class_name"
            placeholder="es. 3ª liceo scientifico"
            value={v.class_name}
            onChange={set('class_name')}
          />
        </div>
        <div>
          <label htmlFor="school">Scuola (facoltativa)</label>
          <input id="school" value={v.school} onChange={set('school')} />
        </div>
        <div>
          <label htmlFor="subjects">Materie (separate da virgola)</label>
          <input
            id="subjects"
            placeholder="es. Matematica, Fisica"
            value={v.subjects}
            onChange={set('subjects')}
          />
        </div>
        <div>
          <label htmlFor="start_date">Data di inizio delle lezioni</label>
          <input id="start_date" type="date" value={v.start_date} onChange={set('start_date')} />
        </div>
      </div>

      <label htmlFor="notes">Annotazioni personali (visibili solo a te)</label>
      <textarea id="notes" rows={4} value={v.notes} onChange={set('notes')} />

      {mode === 'create' && (
        <>
          <label htmlFor="password">Password iniziale (minimo 8 caratteri)</label>
          <div className="inline-field">
            <input
              id="password"
              required
              minLength={8}
              autoComplete="off"
              value={v.password}
              onChange={set('password')}
            />
            <button
              type="button"
              className="btn secondary inline"
              onClick={() => setV({ ...v, password: generatePassword() })}
            >
              Genera
            </button>
          </div>
        </>
      )}

      {error && <p className="error" role="alert">{error}</p>}

      <button type="submit" className="btn" disabled={busy}>
        {busy ? 'Salvataggio…' : submitLabel}
      </button>
    </form>
  )
}
