import { useState, useEffect } from 'react'
import { supabase } from '../App'
import { Rocket, Shield, TrendingUp, Calendar, Key, Check, X } from 'lucide-react'

export default function Login() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [codigoConvite, setCodigoConvite] = useState('')
  const [conviteValidado, setConviteValidado] = useState(false)
  const [validando, setValidando] = useState(false)
  const [codigoInput, setCodigoInput] = useState('')

  // Verificar se há código na URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const codigoUrl = params.get('codigo')
    if (codigoUrl) {
      setCodigoInput(codigoUrl)
      handleValidar(codigoUrl)
    }
  }, [])

  const handleValidar = async (codigo?: string) => {
    const codeToValidate = codigo || codigoInput
    if (!codeToValidate.trim()) {
      setError('Digite o código de convite')
      return
    }

    setValidando(true)
    setError(null)

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || ''}/api/convites/validar`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ codigo: codeToValidate.trim() })
        }
      )

      const data = await response.json()

      if (data.valido) {
        setConviteValidado(true)
        setCodigoConvite(codeToValidate.trim())
        // Salvar no localStorage para uso posterior
        localStorage.setItem('convite_validado', 'true')
        localStorage.setItem('convite_codigo', codeToValidate.trim())
      } else {
        setError(data.detail || 'Código inválido')
        setConviteValidado(false)
        localStorage.removeItem('convite_validado')
        localStorage.removeItem('convite_codigo')
      }
    } catch (err) {
      // Se falhar a chamada, tentar validar localmente (fallback)
      setError('Erro ao validar código. Tente novamente.')
    } finally {
      setValidando(false)
    }
  }

  const handleGoogleLogin = async () => {
    if (!conviteValidado) {
      setError('Primeiro valide seu código de convite')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/login`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      })

      if (error) throw error
    } catch (err: any) {
      setError(err.message || 'Erro ao fazer login com Google')
    } finally {
      setLoading(false)
    }
  }

  const handleVoltar = () => {
    setConviteValidado(false)
    setCodigoConvite('')
    setCodigoInput('')
    localStorage.removeItem('convite_validado')
    localStorage.removeItem('convite_codigo')
    // Limpar URL
    window.history.replaceState({}, '', '/login')
  }

  return (
    <div className="login-container">
      {/* Background Pattern */}
      <div className="login-bg-pattern"></div>

      <div className="login-content">
        {/* Card Principal */}
        <div className="login-card">
          {/* Logo Section */}
          <div className="login-header">
            <div className="login-logo">
              <div className="logo-icon-wrapper">
                <Rocket size={32} />
              </div>
              <div className="logo-text-wrapper">
                <h1>SolarZ Finance</h1>
                <p>Controle de Investimentos - Eventos Marketing</p>
              </div>
            </div>
          </div>

          {/* Welcome Message */}
          <div className="login-welcome">
            <h2>Bem-vindo!</h2>
            <p>
              {conviteValidado
                ? `Código validado! Você pode fazer login.`
                : 'Digite seu código de convite para acessar'}
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="login-error">
              <X size={16} />
              {error}
            </div>
          )}

          {/* Success Message */}
          {conviteValidado && !loading && (
            <div className="login-success">
              <Check size={16} />
              Convite válido! Clique abaixo para entrar.
            </div>
          )}

          {!conviteValidado ? (
            /* Invite Code Form */
            <div className="convite-form">
              <div className="input-group">
                <Key size={18} className="input-icon" />
                <input
                  type="text"
                  placeholder="Digite seu código de convite"
                  value={codigoInput}
                  onChange={(e) => setCodigoInput(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === 'Enter' && handleValidar()}
                  maxLength={8}
                  className="convite-input"
                />
              </div>

              <button
                onClick={() => handleValidar()}
                disabled={validando || !codigoInput.trim()}
                className="login-btn-validate"
              >
                {validando ? (
                  <span className="login-spinner"></span>
                ) : (
                  <>
                    <Shield size={18} />
                    Validar Código
                  </>
                )}
              </button>

              <p className="convite-hint">
                Solicite um código de convite ao administrador do sistema.
              </p>
            </div>
          ) : (
            /* Google Login Button (after validation) */
            <div className="login-area">
              <button
                onClick={handleGoogleLogin}
                disabled={loading}
                className="login-btn-google"
              >
                {loading ? (
                  <span className="login-spinner"></span>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" className="google-icon">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Entrar com Google
                  </>
                )}
              </button>

              <button onClick={handleVoltar} className="btn-voltar">
                <X size={16} />
                Usar outro código
              </button>
            </div>
          )}

          {/* Features */}
          <div className="login-features">
            <div className="feature-item">
              <TrendingUp size={18} />
              <span>Controle de Investimentos</span>
            </div>
            <div className="feature-item">
              <Calendar size={18} />
              <span>Calendário de Pagamentos</span>
            </div>
            <div className="feature-item">
              <Shield size={18} />
              <span>Dados Seguros</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="login-footer">
          <p>Plataforma desenvolvida para SolarZ Marketing</p>
        </div>
      </div>
    </div>
  )
}
