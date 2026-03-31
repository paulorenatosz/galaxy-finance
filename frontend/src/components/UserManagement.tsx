import { useState, useEffect } from 'react'
import { Session } from '@supabase/supabase-js'
import { supabase } from '../App'
import {
  Users, X, Check, Shield, Copy, CheckCircle,
  Key, Trash2, Mail, ToggleLeft, ToggleRight, AlertTriangle, RefreshCw
} from 'lucide-react'

interface UserProfile {
  id: string
  user_id: string
  email: string
  nome: string
  role: string
  avatar_url: string
  ativo: boolean
  created_at: string
}

interface Convite {
  codigo: string
  role: string
  usado: boolean
  usado_por: string | null
  criado_em: string
  usado_em: string | null
  email: string | null
}

const ROLES = [
  { value: 'admin', label: 'Administrador', description: 'Acesso completo' },
  { value: 'gestor', label: 'Gestor', description: 'Gestão de equipe' },
  { value: 'financeiro', label: 'Financeiro', description: 'Acesso financeiro' },
  { value: 'usuario', label: 'Usuário', description: 'Acesso básico' },
]

export default function UserManagement({ session, onClose }: { session: Session, onClose: () => void }) {
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'usuarios' | 'convites'>('usuarios')

  // Modal states
  const [showGerarConvite, setShowGerarConvite] = useState(false)
  const [showListaConvites, setShowListaConvites] = useState(false)
  const [showEnviarEmailModal, setShowEnviarEmailModal] = useState(false)

  // Convite data
  const [convites, setConvites] = useState<Convite[]>([])
  const [novoConviteRole, setNovoConviteRole] = useState('usuario')
  const [codigoGerado, setCodigoGerado] = useState<string | null>(null)
  const [gerandoConvite, setGerandoConvite] = useState(false)
  const [carregandoConvites, setCarregandoConvites] = useState(false)

  // Enviar convite por email
  const [emailData, setEmailData] = useState({ email: '', nome: '', role: 'usuario' })
  const [enviandoEmail, setEnviandoEmail] = useState(false)
  const [emailEnviado, setEmailEnviado] = useState(false)

  // Loading states
  const [copied, setCopied] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [processingUser, setProcessingUser] = useState<string | null>(null)

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('perfiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (data) {
        setUsers(data)
      }
    } catch (err) {
      console.error('Erro:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadConvites = async () => {
    setCarregandoConvites(true)
    try {
      const adminKey = prompt('Digite a chave admin:')
      if (!adminKey) {
        setCarregandoConvites(false)
        return
      }

      const response = await fetch(
        `${import.meta.env.VITE_API_URL || ''}/api/convites/listar?admin_key=${adminKey}`
      )
      const data = await response.json()

      if (response.ok) {
        setConvites(data.convites || [])
        setShowListaConvites(true)
      } else {
        alert('Chave admin inválida')
      }
    } catch (err) {
      console.error('Erro ao carregar convites:', err)
      alert('Erro ao carregar convites')
    } finally {
      setCarregandoConvites(false)
    }
  }

  const handleGerarConvite = async () => {
    setGerandoConvite(true)
    try {
      const adminKey = prompt('Digite a chave admin:')
      if (!adminKey) {
        setGerandoConvite(false)
        return
      }

      const response = await fetch(
        `${import.meta.env.VITE_API_URL || ''}/api/convites/gerar?admin_key=${adminKey}&role=${novoConviteRole}`,
        { method: 'POST' }
      )
      const data = await response.json()

      if (response.ok) {
        setCodigoGerado(data.codigo)
      } else {
        alert(data.detail || 'Erro ao gerar convite')
      }
    } catch (err) {
      console.error('Erro ao gerar convite:', err)
      alert('Erro ao gerar convite')
    } finally {
      setGerandoConvite(false)
    }
  }

  const handleEnviarConviteEmail = async () => {
    if (!emailData.email || !emailData.nome) return

    setEnviandoEmail(true)
    setEmailEnviado(false)

    try {
      const adminKey = prompt('Digite a chave admin:')
      if (!adminKey) {
        setEnviandoEmail(false)
        return
      }

      const response = await fetch(
        `${import.meta.env.VITE_API_URL || ''}/api/convites/enviar`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            admin_key: adminKey,
            email: emailData.email,
            role: emailData.role
          })
        }
      )
      const data = await response.json()

      if (response.ok) {
        setEmailEnviado(true)
        setEmailData({ email: '', nome: '', role: 'usuario' })
        loadConvites()
      } else {
        alert(data.detail || 'Erro ao enviar convite')
      }
    } catch (err) {
      console.error('Erro ao enviar convite:', err)
      alert('Erro ao enviar convite')
    } finally {
      setEnviandoEmail(false)
    }
  }

  const handleDeletarConvite = async (codigo: string) => {
    if (!confirm(`Deletar convite ${codigo}?`)) return

    try {
      const adminKey = prompt('Digite a chave admin:')
      if (!adminKey) return

      const response = await fetch(
        `${import.meta.env.VITE_API_URL || ''}/api/convites/${codigo}?admin_key=${adminKey}`,
        { method: 'DELETE' }
      )

      if (response.ok) {
        setConvites(convites.filter(c => c.codigo !== codigo))
        setMessage({ type: 'success', text: `Convite ${codigo} deletado` })
        setTimeout(() => setMessage(null), 3000)
      } else {
        alert('Erro ao deletar convite')
      }
    } catch (err) {
      console.error('Erro:', err)
    }
  }

  const handleToggleUser = async (user: UserProfile) => {
    const acao = user.ativo ? 'desativar' : 'ativar'
    if (!confirm(`Tem certeza que deseja ${acao} o usuário ${user.nome}?`)) return

    setProcessingUser(user.id)
    try {
      const { error } = await supabase
        .from('perfiles')
        .update({ ativo: !user.ativo })
        .eq('id', user.id)

      if (error) throw error

      setMessage({ type: 'success', text: `Usuário ${user.nome} ${acao === 'ativar' ? 'ativado' : 'desativado'}` })
      setTimeout(() => setMessage(null), 3000)
      loadUsers()
    } catch (err) {
      console.error('Erro:', err)
      setMessage({ type: 'error', text: 'Erro ao atualizar usuário' })
    } finally {
      setProcessingUser(null)
    }
  }

  const copyConviteLink = (codigo: string) => {
    const link = `${window.location.origin}/login?codigo=${codigo}`
    navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const ativoUsers = users.filter(u => u.ativo)
  const inativoUsers = users.filter(u => !u.ativo)

  return (
    <div className="cadastros-container">
      {/* Header */}
      <header className="cadastros-header">
        <div className="header-content">
          <div className="logo-section">
            <div className="logo-icon">
              <Users size={20} />
            </div>
            <div className="logo-text">
              <h1>Controle de Acessos</h1>
              <p>Gerencie usuários e convites</p>
            </div>
          </div>
          <button onClick={onClose} className="btn btn-secondary">
            <X size={16} />
            Voltar
          </button>
        </div>
      </header>

      {/* Message */}
      {message && (
        <div className={`message ${message.type}`}>
          {message.type === 'success' ? <Check size={18} /> : <AlertTriangle size={18} />}
          {message.text}
        </div>
      )}

      {/* Tabs */}
      <div className="tabs-container">
        <button
          className={`tab-btn ${activeTab === 'usuarios' ? 'active' : ''}`}
          onClick={() => setActiveTab('usuarios')}
        >
          <Users size={16} />
          Usuários ({ativoUsers.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'convites' ? 'active' : ''}`}
          onClick={() => setActiveTab('convites')}
        >
          <Key size={16} />
          Convites
        </button>
      </div>

      {/* Tab: Usuários */}
      {activeTab === 'usuarios' && (
        <div className="tab-content">
          <div className="user-mgmt-header">
            <h2>Usuários Ativos ({ativoUsers.length})</h2>
            <button onClick={() => { setCodigoGerado(null); setShowGerarConvite(true); }} className="btn btn-secondary">
              <Key size={16} />
              Gerar Código
            </button>
            <button onClick={() => { setEmailEnviado(false); setShowEnviarEmailModal(true); }} className="btn btn-primary">
              <Mail size={16} />
              Convidar por Email
            </button>
          </div>

          {loading ? (
            <div className="loading">Carregando...</div>
          ) : (
            <div className="users-list">
              {ativoUsers.map(user => (
                <div key={user.id} className="user-item">
                  <div className="user-info">
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt={user.nome} className="user-avatar" />
                    ) : (
                      <div className="user-avatar-placeholder">
                        {user.nome?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                    )}
                    <div>
                      <div className="user-name">{user.nome || 'Sem nome'}</div>
                      <div className="user-email">{user.email}</div>
                    </div>
                  </div>
                  <div className="user-role">
                    <span className={`role-badge ${user.role}`}>
                      {ROLES.find(r => r.value === user.role)?.label || user.role}
                    </span>
                  </div>
                  <div className="user-actions">
                    {user.user_id !== session.user.id && (
                      <button
                        onClick={() => handleToggleUser(user)}
                        disabled={processingUser === user.id}
                        className="btn-icon toggle"
                        title={user.ativo ? 'Desativar' : 'Ativar'}
                      >
                        {processingUser === user.id ? (
                          <RefreshCw size={16} className="spin" />
                        ) : user.ativo ? (
                          <ToggleRight size={16} />
                        ) : (
                          <ToggleLeft size={16} />
                        )}
                      </button>
                    )}
                    {user.user_id === session.user.id && (
                      <span className="badge-you">Você</span>
                    )}
                  </div>
                </div>
              ))}
              {ativoUsers.length === 0 && (
                <div className="empty">Nenhum usuário ativo</div>
              )}
            </div>
          )}

          {/* Inativos */}
          {inativoUsers.length > 0 && (
            <>
              <h3 className="inativos-title">
                <Shield size={16} />
                Usuários Desativados ({inativoUsers.length})
              </h3>
              <div className="users-list users-inativos">
                {inativoUsers.map(user => (
                  <div key={user.id} className="user-item inativo">
                    <div className="user-info">
                      <div className="user-avatar-placeholder">
                        {user.nome?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <div className="user-name">{user.nome || 'Sem nome'}</div>
                        <div className="user-email">{user.email}</div>
                      </div>
                    </div>
                    <div className="user-role">
                      <span className={`role-badge ${user.role}`}>
                        {ROLES.find(r => r.value === user.role)?.label || user.role}
                      </span>
                    </div>
                    <div className="user-actions">
                      <button
                        onClick={() => handleToggleUser(user)}
                        disabled={processingUser === user.id}
                        className="btn-icon activate"
                        title="Ativar"
                      >
                        <ToggleLeft size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Tab: Convites */}
      {activeTab === 'convites' && (
        <div className="tab-content">
          <div className="user-mgmt-header">
            <h2>Códigos de Convite</h2>
            <button onClick={() => { setCodigoGerado(null); setShowGerarConvite(true); }} className="btn btn-secondary">
              <Key size={16} />
              Gerar Código
            </button>
            <button onClick={() => { setEmailEnviado(false); setShowEnviarEmailModal(true); }} className="btn btn-primary">
              <Mail size={16} />
              Enviar por Email
            </button>
            <button onClick={loadConvites} disabled={carregandoConvites} className="btn btn-secondary">
              <RefreshCw size={16} className={carregandoConvites ? 'spin' : ''} />
              {carregandoConvites ? 'Carregando...' : 'Ver Códigos'}
            </button>
          </div>

          {showListaConvites && (
            <div className="convites-list-container">
              {convites.length === 0 ? (
                <div className="empty">Nenhum convite gerado</div>
              ) : (
                convites.map(convite => (
                  <div key={convite.codigo} className={`convite-item ${convite.usado ? 'usado' : ''}`}>
                    <div className="convite-info">
                      <div className="codigo">{convite.codigo}</div>
                      <div className="details">
                        <span className={`role-badge ${convite.role}`}>
                          {ROLES.find(r => r.value === convite.role)?.label || convite.role}
                        </span>
                        <span className={`status ${convite.usado ? 'usado' : 'disponivel'}`}>
                          {convite.usado ? 'Usado' : 'Disponível'}
                        </span>
                      </div>
                      <div className="dates">
                        {convite.usado && convite.usado_por
                          ? `Usado por: ${convite.usado_por}`
                          : `Criado: ${new Date(convite.criado_em).toLocaleDateString('pt-BR')}`
                        }
                      </div>
                    </div>
                    {!convite.usado && (
                      <div className="convite-actions">
                        <button
                          onClick={() => copyConviteLink(convite.codigo)}
                          className="btn-icon"
                          title="Copiar link"
                        >
                          {copied ? <Check size={16} /> : <Copy size={16} />}
                        </button>
                        <button
                          onClick={() => handleDeletarConvite(convite.codigo)}
                          className="btn-icon delete"
                          title="Deletar"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* Modal: Gerar Convite */}
      {showGerarConvite && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Gerar Código de Convite</h3>
              <button onClick={() => { setShowGerarConvite(false); setCodigoGerado(null); }} className="btn-close">
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              {codigoGerado ? (
                <div className="convite-gerado">
                  <CheckCircle size={48} className="check-icon-large" />
                  <h4>Código Gerado!</h4>
                  <div className="codigo-display">{codigoGerado}</div>
                  <p className="link-text">Link para convite:</p>
                  <div className="link-box">
                    {window.location.origin}/login?codigo={codigoGerado}
                  </div>
                  <button onClick={() => copyConviteLink(codigoGerado)} className="btn btn-primary">
                    {copied ? <Check size={16} /> : <Copy size={16} />}
                    {copied ? 'Copiado!' : 'Copiar Link'}
                  </button>
                  <button
                    onClick={() => { setCodigoGerado(null); setShowGerarConvite(false); }}
                    className="btn btn-secondary"
                  >
                    Fechar
                  </button>
                </div>
              ) : (
                <>
                  <p>Selecione o perfil do novo usuário:</p>
                  <div className="form-group">
                    <select
                      value={novoConviteRole}
                      onChange={(e) => setNovoConviteRole(e.target.value)}
                    >
                      {ROLES.map(role => (
                        <option key={role.value} value={role.value}>
                          {role.label} - {role.description}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}
            </div>

            <div className="modal-footer">
              <button onClick={() => { setShowGerarConvite(false); setCodigoGerado(null); }} className="btn btn-secondary">
                Fechar
              </button>
              {!codigoGerado && (
                <button
                  onClick={handleGerarConvite}
                  disabled={gerandoConvite}
                  className="btn btn-primary"
                >
                  <Key size={16} />
                  {gerandoConvite ? 'Gerando...' : 'Gerar Código'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Enviar Convite por Email */}
      {showEnviarEmailModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Enviar Convite por Email</h3>
              <button onClick={() => { setShowEnviarEmailModal(false); setEmailEnviado(false); }} className="btn-close">
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              {emailEnviado ? (
                <div className="convite-gerado">
                  <CheckCircle size={48} className="check-icon-large" />
                  <h4>Convite Enviado!</h4>
                  <p>O email foi enviado com o código de acesso.</p>
                  <button
                    onClick={() => { setShowEnviarEmailModal(false); setEmailEnviado(false); loadConvites(); }}
                    className="btn btn-secondary"
                  >
                    Fechar
                  </button>
                </div>
              ) : (
                <>
                  <div className="form-group">
                    <label>Nome completo *</label>
                    <input
                      type="text"
                      value={emailData.nome}
                      onChange={(e) => setEmailData({ ...emailData, nome: e.target.value })}
                      placeholder="João Silva"
                    />
                  </div>

                  <div className="form-group">
                    <label>Email *</label>
                    <input
                      type="email"
                      value={emailData.email}
                      onChange={(e) => setEmailData({ ...emailData, email: e.target.value })}
                      placeholder="joao@empresa.com.br"
                    />
                  </div>

                  <div className="form-group">
                    <label>Perfil *</label>
                    <select
                      value={emailData.role}
                      onChange={(e) => setEmailData({ ...emailData, role: e.target.value })}
                    >
                      {ROLES.map(role => (
                        <option key={role.value} value={role.value}>
                          {role.label} - {role.description}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}
            </div>

            <div className="modal-footer">
              <button onClick={() => { setShowEnviarEmailModal(false); setEmailEnviado(false); }} className="btn btn-secondary">
                Cancelar
              </button>
              {!emailEnviado && (
                <button
                  onClick={handleEnviarConviteEmail}
                  disabled={enviandoEmail || !emailData.email || !emailData.nome}
                  className="btn btn-primary"
                >
                  <Mail size={16} />
                  {enviandoEmail ? 'Enviando...' : 'Enviar Convite'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
