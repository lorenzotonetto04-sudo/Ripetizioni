import { AuthProvider, useAuth } from './auth'
import Login from './Login'

function Screen() {
  const { loading, session, profile, profileError, signOut } = useAuth()

  if (loading) {
    return (
      <main className="center-screen">
        <p className="muted">Caricamento…</p>
      </main>
    )
  }

  if (!session) return <Login />

  if (profileError || !profile) {
    return (
      <main className="center-screen">
        <div className="card">
          <h1>Accesso non disponibile</h1>
          <p className="error">{profileError}</p>
          <button className="btn" onClick={signOut}>Esci</button>
        </div>
      </main>
    )
  }

  // Schermata provvisoria: le dashboard vere arrivano nella Fase 4
  return (
    <main className="center-screen">
      <div className="card">
        <h1>Benvenuto{profile.full_name ? ', ' + profile.full_name : ''}</h1>
        <p>
          {profile.role === 'admin'
            ? 'Hai effettuato l’accesso come amministratore.'
            : 'Hai effettuato l’accesso come studente.'}
        </p>
        <p className="muted">Fase 3 completata. Prossimo passo: le dashboard.</p>
        <button className="btn secondary" onClick={signOut}>Esci</button>
      </div>
    </main>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <Screen />
    </AuthProvider>
  )
}
