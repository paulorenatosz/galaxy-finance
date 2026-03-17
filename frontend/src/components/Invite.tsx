import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { supabase } from '../App'
import { Rocket, Eye, EyeOff, Check, AlertCircle } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export default function Invite() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token')

  const [loading, setLoading] = useState(true)
  const [valid, setValid] = useState(false)
  const [invite, setInvite] = useState<any>(null)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    validateInvite()
  }, [token])

  const validateInvite = async () => {
    if (!token) {
      setError('Link de convite inválido')
      setLoading(false)
      return
    }

    try {
      const res = await fetch(`${API_URL}/users/validate-invite?token=${token}`)
      const data = await res.json()

      if (data.valid) {
        setValid(true)
        setInvite(data.invite)
      } else {
        setError('Convite inválido ou expirado')
      }
    } catch (err) {
      setError('Erro ao validar convite')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('As senhas não coincidem')
      return
    }

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres')
      return
    }

    setSubmitting(true)

    try {
      const res = await fetch(`${API_URL}/users/accept-invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password })
      })

      const data = await res.json()

      if (data.error) {
        setError(data.error)
      } else {
        setSuccess(true)
        setTimeout(() => {
          navigate('/login')
        }, 3000)
      }
    } catch (err) {
      setError('Erro ao processar convite')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="invite-container">
        <div className="invite-card">
          <div className="loading">Validando convite...</div>
        </div>
      </div>
    )
  }

  if (!valid) {
    return (
      <div className="invite-container">
        <div className="invite-card error">
          <div className="invite-logo">
            <Rocket size={40} />
          </div>
          <h1>Convite Inválido</h1>
          <p>{error || 'Este link de convite não é válido ou expirou.'}</p>
          <button onClick={() => navigate('/login')} className="btn-primary">
            Ir para Login
          </button>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="invite-container">
        <div className="invite-card success">
          <div className="success-icon">
            <Check size={40} />
          </div>
          <h1>Bem-vindo!</h1>
          <p>Seu cadastro foi criado com sucesso!</p>
          <p className="redirect">Redirecionando para login...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="invite-container">
      <div className="invite-card">
        <div className="invite-logo">
          <Rocket size={40} />
        </div>

        <h1>Complete seu Cadastro</h1>
        <p className="invite-info">
          Olá, <strong>{invite?.nome}</strong>!<br />
          Você foi convidado para o <strong>Galaxy Finance</strong><br />
          como <strong>{invite?.role}</strong>
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Senha *</label>
            <div className="password-input">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="toggle-password"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label>Confirmar Senha *</label>
            <input
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repita a senha"
              required
            />
          </div>

          {error && (
            <div className="error-message">
              <AlertCircle size={18} />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || !password || !confirmPassword}
            className="btn-submit"
          >
            {submitting ? 'Criando conta...' : 'Criar Minha Conta'}
          </button>
        </form>

        <p className="login-link">
          Já tem conta? <a href="/login">Fazer Login</a>
        </p>
      </div>
    </div>
  )
}
