import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { createClient, SupabaseClient, Session } from '@supabase/supabase-js'
import Dashboard from './components/Dashboard'
import Login from './components/Login'
import InvestmentForm from './components/InvestmentForm'
import Cadastros from './components/Cadastros'
import UserManagement from './components/UserManagement'
import Invite from './components/Invite'
import Integrations from './components/Integrations'
import Importacao from './components/Importacao'
import Consulta from './components/Consulta'

// Configuração do Supabase - você vai preencher isso
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key'

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey)

function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Handle OAuth callback from Supabase
    const handleCallback = async () => {
      const hash = window.location.hash

      // Check for OAuth callback with access token in hash
      if (hash && hash.includes('access_token')) {
        // Clear hash and reload to let SDK process
        setTimeout(() => {
          window.location.hash = ''
        }, 100)
      }
    }

    // Run callback handler
    handleCallback()

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session)
      setLoading(false)

      // After login, if there's a validated invite code, link it to the user's email
      if (session?.user && _event === 'SIGNED_IN') {
        const codigo = localStorage.getItem('convite_codigo')
        if (codigo) {
          try {
            await fetch(
              `${import.meta.env.VITE_API_URL}/api/convites/usar`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  codigo,
                  email: session.user.email
                })
              }
            )
            // Clear the code from localStorage after use
            localStorage.removeItem('convite_codigo')
            localStorage.removeItem('convite_validado')
          } catch (err) {
            console.error('Erro ao vincular convite:', err)
          }
        }
      }
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
          element={session ? <InvestmentForm session={session} onClose={() => window.history.back()} /> : <Navigate to="/login" />}
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
          path="/integracoes"
          element={session ? <Integrations session={session} onClose={() => window.history.back()} /> : <Navigate to="/login" />}
        />
        <Route
          path="/importacao"
          element={session ? <Importacao session={session} onClose={() => window.history.back()} /> : <Navigate to="/login" />}
        />
        <Route
          path="/consulta"
          element={session ? <Consulta session={session} onClose={() => window.history.back()} /> : <Navigate to="/login" />}
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
