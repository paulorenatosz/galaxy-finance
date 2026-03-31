import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Rocket, Check, Shield, AlertCircle } from 'lucide-react'

export default function Invite() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState<'checking' | 'valid' | 'invalid' | 'used'>('checking')
  const [codigo, setCodigo] = useState('')

  useEffect(() => {
    const codigoUrl = searchParams.get('codigo')
    if (codigoUrl) {
      setCodigo(codigoUrl.toUpperCase())
      validarCodigo(codigoUrl.toUpperCase())
    } else {
      setStatus('invalid')
    }
  }, [])

  const validarCodigo = async (code: string) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || ''}/api/convites/validar`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ codigo: code.trim() })
        }
      )
      const data = await response.json()

      if (data.valido) {
        setStatus('valid')
      } else if (data.detail?.includes('já foi utilizado')) {
        setStatus('used')
      } else {
        setStatus('invalid')
      }
    } catch {
      setStatus('invalid')
    }
  }

  const handleAcessar = () => {
    if (status === 'valid') {
      navigate(`/login?codigo=${codigo}`)
    }
  }

  const handleVoltarLogin = () => {
    navigate('/login')
  }

  return (
    <div className="invite-container">
      <div className="invite-bg-pattern"></div>
      <div className="invite-content">
        <div className="invite-card">
          <div className="invite-logo">
            <Rocket size={48} />
          </div>
          <h1>SolarZ Finance</h1>

          {status === 'checking' && (
            <div className="invite-checking">
              <div className="spinner"></div>
              <p>Verificando código de convite...</p>
            </div>
          )}

          {status === 'valid' && (
            <>
              <div className="invite-success-icon">
                <Check size={48} />
              </div>
              <h2>Convite Válido!</h2>
              <p className="invite-code-display">Código: <strong>{codigo}</strong></p>
              <p className="invite-message">
                Você foi convidado para acessar a plataforma SolarZ Finance.
                Clique abaixo para fazer login com sua conta Google.
              </p>
              <button onClick={handleAcessar} className="btn-primary btn-large">
                <Shield size={18} />
                Fazer Login
              </button>
            </>
          )}

          {status === 'used' && (
            <>
              <div className="invite-error-icon">
                <AlertCircle size={48} />
              </div>
              <h2>Código Já Utilizado</h2>
              <p className="invite-message">
                Este código de convite já foi utilizado por outro usuário.
                Solicite um novo código ao administrador.
              </p>
              <button onClick={handleVoltarLogin} className="btn-secondary">
                Ir para Login
              </button>
            </>
          )}

          {status === 'invalid' && (
            <>
              <div className="invite-error-icon">
                <AlertCircle size={48} />
              </div>
              <h2>Código Inválido</h2>
              <p className="invite-message">
                Este código de convite não é válido ou expirou.
                Solicite um novo código ao administrador do sistema.
              </p>
              <button onClick={handleVoltarLogin} className="btn-secondary">
                Ir para Login
              </button>
            </>
          )}
        </div>

        <p className="invite-footer">
          Plataforma de controle de investimentos - SolarZ Marketing
        </p>
      </div>
    </div>
  )
}
