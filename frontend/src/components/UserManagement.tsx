import { useState, useEffect } from 'react'
import { Session } from '@supabase/supabase-js'
import { supabase } from '../App'
import { 
  Users, Check, Shield, Copy, CheckCircle, 
  Key, Trash2, Mail, ToggleLeft, ToggleRight, AlertTriangle, RefreshCw,
  Info, QrCode, Search, Bell, HelpCircle, ExternalLink, ShieldCheck, MailPlus
} from 'lucide-react'
import TopNavBar from './layout/TopNavBar'
import SideNavBar from './layout/SideNavBar'
import { useNavigate } from 'react-router-dom'

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
  { value: 'admin', label: 'Administrador', description: 'Acesso completo ao sistema e configurações.' },
  { value: 'gestor', label: 'Gestor', description: 'Gerencia equipes e visualiza relatórios de desempenho.' },
  { value: 'financeiro', label: 'Financeiro', description: 'Acesso total aos dados financeiros e lançamentos.' },
  { value: 'usuario', label: 'Usuário', description: 'Acesso básico para consulta e acompanhamento.' },
]

export default function UserManagement({ session, onClose }: { session: Session, onClose: () => void }) {
  const navigate = useNavigate()
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'usuarios' | 'convites'>('usuarios')
  const [searchTerm, setSearchTerm] = useState('')

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

  // Feedback states
  const [copied, setCopied] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [processingUser, setProcessingUser] = useState<string | null>(null)

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('perfiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      if (data) setUsers(data)
    } catch (err) {
      console.error('Erro ao carregar usuários:', err)
      setMessage({ type: 'error', text: 'Erro ao carregar lista de usuários' })
    } finally {
      setLoading(false)
    }
  }

  const loadConvites = async () => {
    setCarregandoConvites(true)
    try {
      const adminKey = prompt('Digite a chave admin para visualizar os convites:')
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
        setActiveTab('convites')
      } else {
        alert(data.message || 'Chave admin inválida')
      }
    } catch (err) {
      console.error('Erro ao carregar convites:', err)
      alert('Erro ao carregar convites do servidor')
    } finally {
      setCarregandoConvites(false)
    }
  }

  const handleGerarConvite = async () => {
    setGerandoConvite(true)
    try {
      const adminKey = prompt('Digite a chave admin para gerar um novo código:')
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
      alert('Erro de conexão ao gerar convite')
    } finally {
      setGerandoConvite(false)
    }
  }

  const handleEnviarConviteEmail = async () => {
    if (!emailData.email || !emailData.nome) return

    setEnviandoEmail(true)
    setEmailEnviado(false)

    try {
      const adminKey = prompt('Digite a chave admin para enviar o convite:')
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
            role: emailData.role,
            nome: emailData.nome
          })
        }
      )
      const data = await response.json()

      if (response.ok) {
        setEmailEnviado(true)
        setEmailData({ email: '', nome: '', role: 'usuario' })
        setTimeout(() => {
          setShowEnviarEmailModal(false)
          setEmailEnviado(false)
        }, 2000)
      } else {
        alert(data.detail || 'Erro ao enviar convite por email')
      }
    } catch (err) {
      console.error('Erro ao enviar convite:', err)
      alert('Erro ao enviar convite por email')
    } finally {
      setEnviandoEmail(false)
    }
  }

  const handleDeletarConvite = async (codigo: string) => {
    if (!confirm(`Tem certeza que deseja invalidar o convite ${codigo}?`)) return

    try {
      const adminKey = prompt('Digite a chave admin:')
      if (!adminKey) return

      const response = await fetch(
        `${import.meta.env.VITE_API_URL || ''}/api/convites/${codigo}?admin_key=${adminKey}`,
        { method: 'DELETE' }
      )

      if (response.ok) {
        setConvites(convites.filter(c => c.codigo !== codigo))
        setMessage({ type: 'success', text: `Convite ${codigo} removido` })
        setTimeout(() => setMessage(null), 3000)
      } else {
        alert('Erro ao deletar convite')
      }
    } catch (err) {
      console.error('Erro ao deletar convite:', err)
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

      setMessage({ type: 'success', text: `Usuário ${user.nome} ${user.ativo ? 'desativado' : 'ativado'} com sucesso` })
      setTimeout(() => setMessage(null), 3000)
      loadUsers()
    } catch (err) {
      console.error('Erro ao atualizar usuário:', err)
      setMessage({ type: 'error', text: 'Erro ao atualizar status do usuário' })
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

  const filteredUsers = users.filter(u => 
    u.nome?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-surface dark:bg-slate-950 font-body text-on-surface">
      <TopNavBar session={session} currentPage="usuarios" />
      <SideNavBar onLogout={handleLogout} />

      <main className="lg:ml-64 pt-16 min-h-screen">
        <div className="max-w-7xl mx-auto p-6 md:p-10 space-y-10">
          
          {/* Header Section */}
          <section className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
            <div className="space-y-1">
              <h1 className="text-4xl font-bold text-on-surface dark:text-white tracking-tight font-headline">Controle de Acessos</h1>
              <p className="text-on-surface-variant dark:text-slate-400 text-lg">Gerencie usuários e convites da plataforma SolarZ.</p>
            </div>
            <div className="flex flex-wrap gap-4">
              <button 
                onClick={() => { setCodigoGerado(null); setShowGerarConvite(true); }}
                className="flex items-center gap-2 px-6 py-3 bg-surface-container-high dark:bg-slate-800 text-primary dark:text-blue-400 font-semibold rounded-xl hover:bg-surface-container-highest dark:hover:bg-slate-700 transition-all active:scale-95"
              >
                <QrCode size={20} />
                Gerar Código
              </button>
              <button 
                onClick={() => { setEmailEnviado(false); setShowEnviarEmailModal(true); }}
                className="flex items-center gap-2 px-8 py-3 bg-gradient-to-br from-primary to-primary-container text-white font-semibold rounded-xl shadow-lg hover:shadow-primary/20 transition-all active:scale-95 border-none"
              >
                <MailPlus size={20} />
                Convidar por Email
              </button>
            </div>
          </section>

          {/* Alert Message */}
          {message && (
            <div className={`flex items-center gap-3 p-4 rounded-2xl animate-in fade-in slide-in-from-top-4 duration-300 ${
              message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' : 'bg-red-50 text-red-800 border border-red-100'
            }`}>
              {message.type === 'success' ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
              <span className="font-medium">{message.text}</span>
            </div>
          )}

          {/* Layout Grid */}
          <section className="grid grid-cols-12 gap-6">
            
            {/* Tabs & Main Content */}
            <div className="col-span-12 lg:col-span-8 space-y-6">
              
              {/* Navigation Tabs */}
              <div className="bg-surface-container-low dark:bg-slate-900/50 p-1.5 rounded-2xl flex gap-1 border border-slate-200 dark:border-slate-800">
                <button 
                  onClick={() => setActiveTab('usuarios')}
                  className={`flex-1 py-3 px-6 rounded-xl font-bold transition-all ${
                    activeTab === 'usuarios' 
                      ? 'bg-white dark:bg-slate-800 text-primary dark:text-blue-400 shadow-sm' 
                      : 'text-on-surface-variant dark:text-slate-500 hover:bg-surface-container-high dark:hover:bg-slate-800'
                  }`}
                >
                  Usuários ({users.length})
                </button>
                <button 
                  onClick={loadConvites}
                  className={`flex-1 py-3 px-6 rounded-xl font-bold transition-all ${
                    activeTab === 'convites' 
                      ? 'bg-white dark:bg-slate-800 text-primary dark:text-blue-400 shadow-sm' 
                      : 'text-on-surface-variant dark:text-slate-500 hover:bg-surface-container-high dark:hover:bg-slate-800'
                  }`}
                >
                  Convites
                </button>
              </div>

              {/* Main Bento Box */}
              <div className="bg-surface-container-lowest dark:bg-slate-900 rounded-[2rem] p-8 min-h-[500px] flex flex-col shadow-[0px_12px_32px_rgba(25,28,30,0.04)] border border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-xl font-bold text-on-surface dark:text-white font-headline">
                    {activeTab === 'usuarios' ? 'Usuários Ativos' : 'Códigos de Convite'}
                  </h2>
                  <div className="flex items-center gap-4">
                    {activeTab === 'usuarios' && (
                      <div className="relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                          type="text"
                          placeholder="Pesquisar..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-9 pr-4 py-2 bg-surface-container-low dark:bg-slate-800 border-none rounded-full text-sm focus:ring-2 focus:ring-primary dark:text-white"
                        />
                      </div>
                    )}
                    <span className="px-4 py-1.5 bg-secondary-container dark:bg-slate-800 text-on-secondary-container dark:text-blue-300 text-[10px] font-bold rounded-full uppercase tracking-widest border border-slate-200 dark:border-slate-700">
                      {activeTab === 'usuarios' ? `${filteredUsers.length} total` : `${convites.length} convites`}
                    </span>
                  </div>
                </div>

                {loading ? (
                  <div className="flex-1 flex items-center justify-center">
                    <RefreshCw size={40} className="text-primary animate-spin opacity-20" />
                  </div>
                ) : activeTab === 'usuarios' ? (
                  filteredUsers.length > 0 ? (
                    <div className="space-y-4">
                      {filteredUsers.map(user => (
                        <div key={user.id} className={`group flex items-center justify-between p-4 rounded-2xl border transition-all ${
                          user.ativo ? 'bg-white dark:bg-slate-800/40 border-slate-100 dark:border-slate-800' : 'bg-slate-50 dark:bg-slate-900/20 border-slate-100 dark:border-slate-800/50 opacity-60'
                        }`}>
                          <div className="flex items-center gap-4">
                            {user.avatar_url ? (
                              <img src={user.avatar_url} alt={user.nome} className="w-12 h-12 rounded-full object-cover border-2 border-white dark:border-slate-700 shadow-sm" />
                            ) : (
                              <div className="w-12 h-12 rounded-full bg-primary-fixed dark:bg-blue-900/50 flex items-center justify-center text-primary dark:text-blue-300 font-bold text-lg">
                                {user.nome?.charAt(0).toUpperCase() || '?'}
                              </div>
                            )}
                            <div>
                              <div className="font-bold text-on-surface dark:text-white flex items-center gap-2">
                                {user.nome || 'Sem nome'}
                                {user.user_id === session.user.id && (
                                  <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[10px] font-bold rounded uppercase">Você</span>
                                )}
                              </div>
                              <div className="text-xs text-on-surface-variant dark:text-slate-500">{user.email}</div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-8">
                            <div className="hidden md:block text-right">
                              <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                user.role === 'admin' ? 'bg-purple-50 text-purple-700 border border-purple-100' :
                                user.role === 'gestor' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                                user.role === 'financeiro' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                                'bg-slate-50 text-slate-700 border border-slate-200'
                              }`}>
                                {ROLES.find(r => r.value === user.role)?.label || user.role}
                              </span>
                              <div className="text-[10px] text-slate-400 mt-1">Desde {new Date(user.created_at).toLocaleDateString('pt-BR')}</div>
                            </div>

                            <button 
                              onClick={() => handleToggleUser(user)}
                              disabled={processingUser === user.id}
                              className={`p-2 rounded-xl transition-all ${
                                user.ativo ? 'text-primary dark:text-blue-400 hover:bg-primary/5' : 'text-slate-400 hover:bg-slate-100'
                              }`}
                            >
                              {processingUser === user.id ? (
                                <RefreshCw size={20} className="animate-spin" />
                              ) : user.ativo ? (
                                <ToggleRight size={28} />
                              ) : (
                                <ToggleLeft size={28} />
                              )}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center space-y-6 opacity-80">
                      <div className="w-24 h-24 rounded-full bg-surface-container-low dark:bg-slate-800 flex items-center justify-center">
                        <Users size={48} className="text-outline-variant" />
                      </div>
                      <div className="text-center space-y-2">
                        <h3 className="text-xl font-semibold text-on-surface dark:text-white">Nenhum usuário encontrado</h3>
                        <p className="text-on-surface-variant dark:text-slate-400 max-w-xs">Tente ajustar sua pesquisa ou convide novos colaboradores para a plataforma.</p>
                      </div>
                    </div>
                  )
                ) : (
                  /* Convites Tab Content */
                  showListaConvites ? (
                    <div className="space-y-4">
                      {convites.length > 0 ? (
                        convites.map(convite => (
                          <div key={convite.codigo} className={`flex items-center justify-between p-5 rounded-2xl border transition-all ${
                            convite.usado ? 'bg-slate-50 dark:bg-slate-900/40 border-slate-100 dark:border-slate-800/50 opacity-60' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700'
                          }`}>
                            <div className="space-y-1">
                              <div className="flex items-center gap-3">
                                <span className="font-mono font-bold text-lg tracking-wider text-primary dark:text-blue-400">{convite.codigo}</span>
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                  convite.usado ? 'bg-slate-200 text-slate-600' : 'bg-emerald-50 text-emerald-700'
                                }`}>
                                  {convite.usado ? 'Utilizado' : 'Disponível'}
                                </span>
                              </div>
                              <div className="text-xs text-slate-500 font-medium">
                                Nível: {ROLES.find(r => r.value === convite.role)?.label} • Criado em {new Date(convite.criado_em).toLocaleDateString('pt-BR')}
                              </div>
                              {convite.usado_por && (
                                <div className="text-xs text-blue-600 dark:text-blue-400 font-bold">Resgatado por: {convite.usado_por}</div>
                              )}
                            </div>

                            {!convite.usado && (
                              <div className="flex items-center gap-2">
                                <button 
                                  onClick={() => copyConviteLink(convite.codigo)}
                                  className="p-3 bg-surface-container-low dark:bg-slate-700 rounded-xl text-slate-600 dark:text-slate-300 hover:text-primary dark:hover:text-blue-400 transition-all active:scale-90"
                                  title="Copiar Link"
                                >
                                  {copied ? <Check size={18} /> : <Copy size={18} />}
                                </button>
                                <button 
                                  onClick={() => handleDeletarConvite(convite.codigo)}
                                  className="p-3 bg-red-50 dark:bg-red-900/20 rounded-xl text-red-500 hover:bg-red-100 dark:hover:bg-red-900/40 transition-all active:scale-90"
                                  title="Deletar Convite"
                                >
                                  <Trash2 size={18} />
                                </button>
                              </div>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="flex-1 flex flex-col items-center justify-center space-y-6 opacity-60 py-20">
                          <HelpCircle size={48} className="text-slate-300" />
                          <p className="font-medium text-slate-500">Nenhum convite gerado recentemente.</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center space-y-6 py-20">
                      <div className="w-20 h-20 bg-primary/5 rounded-full flex items-center justify-center border-2 border-dashed border-primary/20">
                        <ShieldCheck size={32} className="text-primary" />
                      </div>
                      <div className="text-center space-y-4 max-w-sm">
                        <h4 className="text-lg font-bold">Protegido por Firewall</h4>
                        <p className="text-sm text-slate-500">Para visualizar a lista de convites ativos e expetados, informe sua chave de administrador.</p>
                        <button 
                          onClick={loadConvites}
                          className="px-6 py-2 bg-primary text-white rounded-full font-bold text-sm hover:shadow-lg transition-all"
                        >
                          Unlock List
                        </button>
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>

            {/* Info Sidebar */}
            <div className="col-span-12 lg:col-span-4 space-y-6">
              
              {/* Security Box */}
              <div className="bg-primary dark:bg-blue-700 text-on-primary p-8 rounded-[2rem] shadow-xl relative overflow-hidden group border-none">
                <div className="relative z-10 space-y-4">
                  <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-md">
                    <Shield size={24} />
                  </div>
                  <h3 className="text-xl font-bold font-headline">Segurança e Níveis</h3>
                  <p className="text-primary-fixed dark:text-blue-100 text-sm leading-relaxed opacity-90">
                    Defina quem pode visualizar dados financeiros sensíveis ou apenas acompanhar o desempenho dos ativos solares. Cada perfil possui permissões específicas.
                  </p>
                  <button className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest bg-white/10 hover:bg-white/20 px-4 py-2 rounded-full transition-all">
                    Ver Tabela de Permissões
                    <Info size={14} />
                  </button>
                </div>
                <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-700">
                  <ShieldCheck size={160} />
                </div>
              </div>

              {/* Status Stats */}
              <div className="bg-surface-container-low dark:bg-slate-900 p-8 rounded-[2rem] space-y-6 border border-slate-100 dark:border-slate-800">
                <h4 className="font-bold text-on-surface dark:text-white font-headline">Status de Convites</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-tertiary"></div>
                      <span className="text-sm font-medium dark:text-slate-300">Pendentes</span>
                    </div>
                    <span className="font-bold text-on-surface dark:text-white">{activeTab === 'convites' ? convites.filter(c => !c.usado).length : '?'}</span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-primary"></div>
                      <span className="text-sm font-medium dark:text-slate-300">Utilizados</span>
                    </div>
                    <span className="font-bold text-on-surface dark:text-white">{activeTab === 'convites' ? convites.filter(c => c.usado).length : '?'}</span>
                  </div>
                </div>
                <button 
                  onClick={() => { setCodigoGerado(null); setShowGerarConvite(true); }}
                  className="w-full py-4 text-primary dark:text-blue-400 font-bold text-sm hover:underline flex items-center justify-center gap-2"
                >
                  Criar novo acesso rápido
                  <ExternalLink size={14} />
                </button>
              </div>

              {/* Visual Card */}
              <div className="h-48 rounded-[2rem] overflow-hidden relative shadow-lg group">
                <img 
                  src="https://images.unsplash.com/photo-1509391366360-2e959784a276?auto=format&fit=crop&q=80&w=600" 
                  alt="Solar Panels" 
                  className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end p-8">
                  <p className="text-white text-sm font-medium italic opacity-90 leading-tight">
                    "Energia limpa, gestão transparente e controle total de quem acessa sua operação."
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Modal: Gerar Convite */}
      {showGerarConvite && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <h3 className="text-xl font-bold font-headline dark:text-white">Gerar Código</h3>
              <button onClick={() => { setShowGerarConvite(false); setCodigoGerado(null); }} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all">
                <ToggleLeft size={24} className="rotate-45" /> {/* Close icon substitute or use X */}
              </button>
            </div>

            <div className="p-10 space-y-6">
              {codigoGerado ? (
                <div className="text-center space-y-6">
                  <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle size={40} className="text-emerald-500" />
                  </div>
                  <div>
                    <h4 className="text-2xl font-bold dark:text-white">Código Criado!</h4>
                    <p className="text-slate-500 mt-2">Compartilhe o código abaixo:</p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700">
                    <span className="text-3xl font-mono font-black tracking-[0.2em] text-primary dark:text-blue-400">{codigoGerado}</span>
                  </div>
                  <div className="flex flex-col gap-3">
                    <button 
                      onClick={() => copyConviteLink(codigoGerado)}
                      className="w-full py-4 bg-primary text-white rounded-2xl font-bold flex items-center justify-center gap-3 shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all"
                    >
                      {copied ? <Check size={20} /> : <Copy size={20} />}
                      {copied ? 'Copiado!' : 'Copiar Link de Convite'}
                    </button>
                    <button onClick={() => { setShowGerarConvite(false); setCodigoGerado(null); }} className="w-full py-4 text-slate-500 font-bold">Fechar</button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <p className="text-slate-500 text-sm">Selecione o nível de permissão que o portador deste código terá ao se cadastrar.</p>
                  <div className="space-y-3">
                    {ROLES.map(role => (
                      <label key={role.value} className={`flex items-start gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                        novoConviteRole === role.value ? 'border-primary bg-primary/5' : 'border-slate-100 dark:border-slate-800 hover:border-slate-200'
                      }`}>
                        <input 
                          type="radio" 
                          name="role" 
                          className="mt-1 text-primary focus:ring-primary"
                          checked={novoConviteRole === role.value}
                          onChange={() => setNovoConviteRole(role.value)}
                        />
                        <div className="flex-1">
                          <div className="font-bold text-sm dark:text-white">{role.label}</div>
                          <div className="text-[11px] text-slate-500 leading-tight mt-0.5">{role.description}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                  <button 
                    onClick={handleGerarConvite}
                    disabled={gerandoConvite}
                    className="w-full py-4 bg-primary text-white rounded-2xl font-bold flex items-center justify-center gap-3 shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all disabled:opacity-50"
                  >
                    {gerandoConvite ? <RefreshCw size={20} className="animate-spin" /> : <Key size={20} />}
                    {gerandoConvite ? 'Gerando...' : 'Gerar Código de Acesso'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Enviar Convite por Email */}
      {showEnviarEmailModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <h3 className="text-xl font-bold font-headline dark:text-white">Convidar Colaborador</h3>
              <button onClick={() => setShowEnviarEmailModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all">
                <ToggleLeft size={24} className="rotate-45 text-slate-400" />
              </button>
            </div>

            <div className="p-10 space-y-6">
              {emailEnviado ? (
                <div className="text-center space-y-6 py-4">
                  <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto">
                    <Mail size={40} className="text-emerald-500" />
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-2xl font-bold dark:text-white">Email Despachado!</h4>
                    <p className="text-slate-500">O convite foi enviado para <strong>{emailData.email}</strong>.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-400 pl-1">Nome Completo</label>
                      <input 
                        type="text" 
                        placeholder="Ex: João Silva"
                        className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-primary dark:text-white"
                        value={emailData.nome}
                        onChange={(e) => setEmailData({...emailData, nome: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-400 pl-1">E-mail Corporativo</label>
                      <input 
                        type="email" 
                        placeholder="joao@solarz.com.br"
                        className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-primary dark:text-white"
                        value={emailData.email}
                        onChange={(e) => setEmailData({...emailData, email: e.target.value})}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400 pl-1">Definir Nível de Acesso</label>
                    <div className="grid grid-cols-2 gap-3">
                      {ROLES.map(role => (
                        <button
                          key={role.value}
                          onClick={() => setEmailData({...emailData, role: role.value})}
                          className={`p-4 rounded-2xl border-2 text-left transition-all ${
                            emailData.role === role.value ? 'border-primary bg-primary/5' : 'border-slate-50 dark:border-slate-800 hover:border-slate-200'
                          }`}
                        >
                          <div className="font-bold text-xs dark:text-white">{role.label}</div>
                          <div className="text-[10px] text-slate-400 leading-tight mt-1 truncate">{role.description}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <button 
                    onClick={handleEnviarConviteEmail}
                    disabled={enviandoEmail || !emailData.email || !emailData.nome}
                    className="w-full py-5 bg-primary text-white rounded-2xl font-bold flex items-center justify-center gap-3 shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all disabled:opacity-50 mt-4 border-none"
                  >
                    {enviandoEmail ? <RefreshCw size={20} className="animate-spin" /> : <Mail size={20} />}
                    {enviandoEmail ? 'Processando Convite...' : 'Enviar Convite agora'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
