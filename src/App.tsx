import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './auth'
import Login from './Login'
import AppShell from './layout/AppShell'
import AdminDashboard from './pages/AdminDashboard'
import StudentDashboard from './pages/StudentDashboard'
import Students from './pages/Students'
import StudentNew from './pages/StudentNew'
import StudentDetail from './pages/StudentDetail'
import AdminLessons from './pages/AdminLessons'
import LessonEditor from './pages/LessonEditor'
import StudentLessonsPage from './pages/StudentLessonsPage'
import Placeholder from './pages/Placeholder'
import { adminNav, studentNav } from './nav'

// Sezioni già realizzate (le altre mostrano ancora il segnaposto)
const BUILT = ['/', '/studenti', '/lezioni']

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
          {isAdmin && (
            <>
              <Route path="/studenti" element={<Students />} />
              <Route path="/studenti/nuovo" element={<StudentNew />} />
              <Route path="/studenti/:id" element={<StudentDetail />} />
              <Route path="/lezioni" element={<AdminLessons />} />
              <Route path="/lezioni/nuova" element={<LessonEditor mode="create" />} />
              <Route path="/lezioni/:id" element={<LessonEditor mode="edit" />} />
            </>
          )}
          {!isAdmin && <Route path="/lezioni" element={<StudentLessonsPage />} />}
          {items
            .filter((i) => !BUILT.includes(i.to))
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
