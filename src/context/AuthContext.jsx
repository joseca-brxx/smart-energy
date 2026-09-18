import { createContext, useContext, useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'

const AuthContext = createContext(null)
const LOCAL_USERS_KEY = 'smartenergy_users_v1'
const LOCAL_SESSION_KEY = 'smartenergy_session_v1'

function readLocalUsers() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_USERS_KEY)) || []
  } catch {
    return []
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isSupabaseConfigured) {
      supabase.auth.getSession().then(({ data }) => {
        setUser(data.session?.user ?? null)
        setLoading(false)
      })
      const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ?? null)
      })
      return () => sub.subscription.unsubscribe()
    } else {
      // Modo local: sesión guardada en localStorage
      const raw = localStorage.getItem(LOCAL_SESSION_KEY)
      setUser(raw ? JSON.parse(raw) : null)
      setLoading(false)
    }
  }, [])

  async function signUp(email, password, rol = 'usuario') {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.auth.signUp({ email, password })
      if (error) throw error
      return data.user
    }
    const users = readLocalUsers()
    if (users.some((u) => u.email === email)) {
      throw new Error('Ese correo ya está registrado')
    }
    const newUser = { id: crypto.randomUUID(), email, password, rol, plan: 'basico' }
    users.push(newUser)
    localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users))
    const publicUser = { id: newUser.id, email, rol, plan: newUser.plan }
    localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(publicUser))
    setUser(publicUser)
    return publicUser
  }

  async function signIn(email, password) {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      return data.user
    }
    const users = readLocalUsers()
    // Usuario administrador de demostración
    if (email === 'admin@smartenergy.com' && password === 'admin123') {
      const adminUser = { id: 'admin-demo', email, rol: 'administrador', plan: 'premium' }
      localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(adminUser))
      setUser(adminUser)
      return adminUser
    }
    const found = users.find((u) => u.email === email && u.password === password)
    if (!found) throw new Error('Correo o contraseña incorrectos')
    const publicUser = { id: found.id, email: found.email, rol: found.rol, plan: found.plan }
    localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(publicUser))
    setUser(publicUser)
    return publicUser
  }

  async function signOut() {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut()
    } else {
      localStorage.removeItem(LOCAL_SESSION_KEY)
    }
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, signUp, signIn, signOut, isSupabaseConfigured }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
