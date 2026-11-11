import { useState } from 'react'
import type { FormEvent } from 'react'
import { useAuth } from './auth'

export default function Login() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const message = await signIn(email, password)
    if (message) setError(message)
    setBusy(false)
  }

  return (
    <main className="center-screen">
      <form className="card" onSubmit={handleSubmit}>
        <h1>Registro Ripetizioni</h1>
        <p className="muted">Accedi con le tue credenziali.</p>

        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          autoComplete="username"
          inputMode="email"
          autoCapitalize="none"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && <p className="error" role="alert">{error}</p>}

        <button type="submit" className="btn" disabled={busy}>
          {busy ? 'Accesso in corso…' : 'Accedi'}
        </button>
      </form>
    </main>
  )
}
