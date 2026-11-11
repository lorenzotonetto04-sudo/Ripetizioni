import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'

export type Profile = {
  id: string
  role: 'admin' | 'student'
  full_name: string
  email: string | null
}

type AuthState = {
  loading: boolean
  session: Session | null
  profile: Profile | null
  profileError: string | null
  signIn: (email: string, password: string) => Promise<string | null>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [sessionLoading, setSessionLoading] = useState(true)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)

  // 1. Legge la sessione salvata e resta in ascolto di login/logout
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setSessionLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  // 2. Quando c'è un utente collegato, legge il suo ruolo dal database
  const userId = session?.user.id
  useEffect(() => {
    if (!userId) {
      setProfile(null)
      setProfileError(null)
      setProfileLoading(false)
      return
    }
    let cancelled = false
    setProfileLoading(true)
    supabase
      .from('profiles')
      .select('id, role, full_name, email')
      .eq('id', userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) {
          setProfile(null)
          setProfileError('Impossibile leggere il profilo: ' + error.message)
        } else if (!data) {
          setProfile(null)
          setProfileError('Questo account non è ancora abilitato. Contatta il tuo insegnante.')
        } else {
          setProfile(data as Profile)
          setProfileError(null)
        }
        setProfileLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [userId])

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    if (!error) return null
    if (error.message.toLowerCase().includes('invalid login')) {
      return 'Email o password non corretta.'
    }
    return 'Accesso non riuscito: ' + error.message
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  const waitingForProfile = !!userId && !profile && !profileError
  const loading = sessionLoading || profileLoading || waitingForProfile

  return (
    <AuthContext.Provider
      value={{ loading, session, profile, profileError, signIn, signOut }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth va usato dentro AuthProvider')
  return ctx
}
