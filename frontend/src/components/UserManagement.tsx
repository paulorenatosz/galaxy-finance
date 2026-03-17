import { useState, useEffect } from 'react'
import { Session } from '@supabase/supabase-js'
import { supabase } from '../App'
import {
  Users, Plus, Trash2, Edit2, X, Send, Check, UserPlus, Shield, Copy, CheckCircle
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

interface Invite {
  email: string
  nome: string
  role: string
}

const ROLES = [
  { value: 'admin', label: 'Administrador', description: 'Acesso completo' },
  { value: 'gestor', label: 'Gestor', description: 'Gestão de equipe' },
  { value: 'financeiro', label: 'Financeiro', description: 'Acesso financeiro' },
  { value: 'usuario', label: 'Usuário', description: 'Acesso básico' },
]

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export default function UserManagement({ session, onClose }: { session: Session, onClose: () => void }) {
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [showInvite, setShowInvite] = useState(false)
  const [inviteData, setInviteData] = useState<Invite>({ email: '', nome: '', role: 'usuario' })
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null)
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const copyToClipboard = async () => {
    if (inviteLink) {
      await navigator.clipboard.writeText(inviteLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }
  const [permissions, setPermissions] = useState<any>(null)

  useEffect(() => {
    loadUsers()
    loadPermissions()
  }, [])

  const loadUsers = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/users/list`)
      const data = await res.json()
      if (data.users) {
        setUsers(data.users)
      }
    } catch (err) {
      console.error('Erro:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadPermissions = async () => {
    try {
      const res = await fetch(`${API_URL}/users/permissions`)
      const data = await res.json()
      setPermissions(data.roles)
    } catch {}
  }

  const handleInvite = async () => {
    if (!inviteData.email || !inviteData.nome) return

    setSending(true)
    setMessage(null)

    try {
      const res = await fetch(`${API_URL}/users/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inviteData)
      })
      const data = await res.json()

      if (data.error) {
        setMessage({ type: 'error', text: data.error })
      } else {
        setInviteLink(data.invite_link)
        setMessage({ type: 'success', text: 'Convite criado com sucesso!' })
        setInviteData({ email: '', nome: '', role: 'usuario' })
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setSending(false)
    }
  }

  const handleDeactivate = async (userId: string) => {
    if (!confirm('Tem certeza que deseja desativar este usuário?')) return

    try {
      await fetch(`${API_URL}/users/deactivate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId })
      })
      loadUsers()
    } catch (err) {
      console.error('Erro:', err)
    }
  }

  const getRoleBadge = (role: string) => {
    const colors: Record<string, string> = {
      admin: '#0066CC',
      gestor: '#7C3AED',
      financeiro: '#059669',
      usuario: '#6B7280'
    }
    return colors[role] || colors.usuario
  }

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
              <h1>Gestão de Usuários</h1>
              <p>Cadastre e gerencie acessos</p>
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
          {message.type === 'success' ? <Check size={18} /> : <Shield size={18} />}
          {message.text}
        </div>
      )}

      {/* Invite Link */}
      {inviteLink && (
        <div className="invite-link-box">
          <div className="invite-link-header">
            <CheckCircle size={18} className="check-icon" />
            <span>Convite criado! Copie o link e envie para o usuário:</span>
          </div>
          <div className="invite-link-content">
            <input type="text" value={inviteLink} readOnly className="invite-link-input" />
            <button onClick={copyToClipboard} className="btn-copy">
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? 'Copiado!' : 'Copiar'}
            </button>
          </div>
          <button onClick={() => setInviteLink(null)} className="btn-close-link">
            Fechar
          </button>
        </div>
      )}

      {/* Content */}
      <div className="tab-content">
        <div className="user-mgmt-header">
          <h2>Usuários Ativos ({users.length})</h2>
          <button onClick={() => setShowInvite(true)} className="btn btn-primary">
            <UserPlus size={16} />
            Convidar Usuário
          </button>
        </div>

        {/* Permissions Legend */}
        {permissions && (
          <div className="permissions-legend">
            <h4>Perfis e Permissões:</h4>
            <div className="roles-grid">
              {Object.entries(permissions).map(([key, value]: [string, any]) => (
                <div key={key} className={`role-card ${key}`}>
                  <div className={`role-header ${key}`}>
                    {value.name}
                  </div>
                  <div className="role-perms">
                    {value.permissions.map((p: string) => (
                      <span key={p} className="perm-badge">{p.replace('_', ' ')}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Users List */}
        {loading ? (
          <div className="loading">Carregando...</div>
        ) : (
          <div className="users-list">
            {users.map(user => (
              <div key={user.id} className="user-item">
                <div className="user-info">
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt={user.nome} className="user-avatar" />
                  ) : (
                    <div className="user-avatar-placeholder">
                      {user.nome.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div className="user-name">{user.nome}</div>
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
                      onClick={() => handleDeactivate(user.user_id)}
                      className="btn-icon delete"
                      title="Desativar"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))}
            {users.length === 0 && (
              <div className="empty">Nenhum usuário cadastrado</div>
            )}
          </div>
        )}
      </div>

      {/* Invite Modal */}
      {showInvite && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Convidar Novo Usuário</h3>
              <button onClick={() => setShowInvite(false)} className="btn-close">
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label>Nome completo *</label>
                <input
                  type="text"
                  value={inviteData.nome}
                  onChange={(e) => setInviteData({...inviteData, nome: e.target.value})}
                  placeholder="João Silva"
                />
              </div>

              <div className="form-group">
                <label>Email *</label>
                <input
                  type="email"
                  value={inviteData.email}
                  onChange={(e) => setInviteData({...inviteData, email: e.target.value})}
                  placeholder="joao@empresa.com.br"
                />
              </div>

              <div className="form-group">
                <label>Perfil *</label>
                <select
                  value={inviteData.role}
                  onChange={(e) => setInviteData({...inviteData, role: e.target.value})}
                >
                  {ROLES.map(role => (
                    <option key={role.value} value={role.value}>
                      {role.label} - {role.description}
                    </option>
                  ))}
                </select>
              </div>

              {message && (
                <div className={`message ${message.type}`}>
                  {message.text}
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button onClick={() => setShowInvite(false)} className="btn btn-secondary">
                Cancelar
              </button>
              <button
                onClick={handleInvite}
                disabled={sending || !inviteData.email || !inviteData.nome}
                className="btn btn-primary"
              >
                <Send size={16} />
                {sending ? 'Enviando...' : 'Enviar Convite'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
