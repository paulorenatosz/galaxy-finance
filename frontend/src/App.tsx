import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { createClient, SupabaseClient, Session } from '@supabase/supabase-js'
import Dashboard from './components/Dashboard'
import Login from './components/Login'
import InvestmentForm from './components/InvestmentForm'
import Cadastros from './components/Cadastros'
import UserManagement from './components/UserManagement'
import Invite from './components/Invite'

// Configuração do Supabase - você vai preencher isso
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key'

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey)

function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-nebula-500"></div>
      </div>
    )
  }

  return (
    <BrowserRouter>
      <div className="stars"></div>
      <Routes>
        <Route
          path="/login"
          element={session ? <Navigate to="/" /> : <Login />}
        />
        <Route
          path="/"
          element={session ? <Dashboard session={session} /> : <Navigate to="/login" />}
        />
        <Route
          path="/novo-investimento"
          element={session ? <InvestmentForm session={session} /> : <Navigate to="/login" />}
        />
        <Route
          path="/cadastros"
          element={session ? <Cadastros session={session} onClose={() => window.history.back()} /> : <Navigate to="/login" />}
        />
        <Route
          path="/usuarios"
          element={session ? <UserManagement session={session} onClose={() => window.history.back()} /> : <Navigate to="/login" />}
        />
        <Route
          path="/convite"
          element={<Invite />}
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App
