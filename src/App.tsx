import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './auth'
import Login from './Login'
import AppShell from './layout/AppShell'
import AdminDashboard from './pages/AdminDashboard'
import StudentDashboard from './pages/StudentDashboard'
import Placeholder from './pages/Placeholder'
import { adminNav, studentNav } from './nav'

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

  const isAdmin = profile.role === 'admin'
  const items = isAdmin ? adminNav : studentNav

  return (
    <HashRouter>
      <Routes>
        <Route element={<AppShell items={items} />}>
          <Route index element={isAdmin ? <AdminDashboard /> : <StudentDashboard />} />
          {items
            .filter((i) => i.to !== '/')
            .map((i) => (
              <Route key={i.to} path={i.to} element={<Placeholder title={i.label} />} />
            ))}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <Screen />
    </AuthProvider>
  )
}
