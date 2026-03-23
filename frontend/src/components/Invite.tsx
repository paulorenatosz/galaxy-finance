import { useNavigate } from 'react-router-dom'
import { Rocket } from 'lucide-react'

export default function Invite() {
  const navigate = useNavigate()

  return (
    <div className="invite-container">
      <div className="invite-card">
        <div className="invite-logo">
          <Rocket size={40} />
        </div>
        <h1>Sistema de Convites</h1>
        <p>Os convites estão sendo simplificados.</p>
        <p>Agora você pode acessar diretamente pelo login com Google.</p>
        <button onClick={() => navigate('/login')} className="btn-primary">
          Ir para Login
        </button>
      </div>
    </div>
  )
}
