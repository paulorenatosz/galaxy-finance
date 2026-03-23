import { useState, useEffect } from 'react'
import { Session } from '@supabase/supabase-js'
import { supabase } from '../App'
import TopNavBar from './layout/TopNavBar'
import SideNavBar from './layout/SideNavBar'
import BottomNavBar from './layout/BottomNavBar'
import {
  Check, AlertCircle, ExternalLink, RefreshCw, Calendar, FileSpreadsheet,
  Mail, HardDrive, MessageSquare, Unlink, CheckCircle
} from 'lucide-react'

const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

interface IntegrationsProps {
  session: Session
  onClose: () => void
}

interface IntegrationStatus {
  slack?: { connected: boolean; message?: string }
  google?: { connected: boolean; message?: string }
}

export default function Integrations({ session, onClose }: IntegrationsProps) {
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<IntegrationStatus>({})
  const [testingSlack, setTestingSlack] = useState(false)
  const [googleAuthUrl, setGoogleAuthUrl] = useState<string | null>(null)

  useEffect(() => {
    checkIntegrationStatus()
  }, [])

  const checkIntegrationStatus = async () => {
    setLoading(true)
    try {
      // Verificar Slack
      const slackRes = await fetch(`${BACKEND_URL}/slack/test`, {
        method: 'POST'
      })
      const slackData = await slackRes.json()

      // Verificar Google
      const googleRes = await fetch(`${BACKEND_URL}/google/status`)
      const googleData = await googleRes.json()

      setStatus({
        slack: {
          connected: slackRes.ok && slackData.status === 'ok',
          message: slackData.message
        },
        google: {
          connected: googleData.connected || false,
          message: googleData.message
        }
      })

      if (!googleData.connected) {
        setGoogleAuthUrl(googleData.authorize_url)
      }
    } catch (err) {
      console.error('Erro ao verificar status:', err)
    } finally {
      setLoading(false)
    }
  }

  const testSlack = async () => {
    setTestingSlack(true)
    try {
      const response = await fetch(`${BACKEND_URL}/slack/test`, {
        method: 'POST'
      })
      const data = await response.json()
      setStatus(prev => ({
        ...prev,
        slack: {
          connected: response.ok && data.status === 'ok',
          message: data.message || data.detail
        }
      }))
    } catch (err) {
      setStatus(prev => ({
        ...prev,
        slack: { connected: false, message: 'Erro de conexão' }
      }))
    } finally {
      setTestingSlack(false)
    }
  }

  const connectGoogle = () => {
    if (googleAuthUrl) {
      window.location.href = googleAuthUrl
    }
  }

  const disconnectGoogle = async () => {
    try {
      await fetch(`${BACKEND_URL}/google/revoke`, { method: 'POST' })
      setStatus(prev => ({
        ...prev,
        google: { connected: false, message: 'Desconectado' }
      }))
      checkIntegrationStatus()
    } catch (err) {
      console.error('Erro ao desconectar:', err)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    onClose()
  }

  const [searchQuery, setSearchQuery] = useState('')

  const integrations = [
    {
      id: 'slack',
      name: 'Slack',
      description: 'Receba notificações sobre novos investimentos e pagamentos no seu canal do Slack',
      icon: MessageSquare,
      color: '#4A154B',
      connected: status.slack?.connected || false,
      message: status.slack?.message,
      features: [
        'Notificações de novos investimentos',
        'Alertas de vencimento',
        'Resumo diário de gastos'
      ],
      configNeeded: true
    },
    {
      id: 'google',
      name: 'Google Workspace',
      description: 'Conecte sua conta Google para usar Calendar, Drive, Sheets e Gmail',
      icon: ExternalLink,
      color: '#4285F4',
      connected: status.google?.connected || false,
      message: status.google?.message,
      features: [
        'Criar eventos de pagamento no Calendar',
        'Exportar dados para Google Sheets',
        'Armazenar arquivos no Google Drive',
        'Enviar notificações por email'
      ],
      configNeeded: false
    },
    {
      id: 'calendar',
      name: 'Google Calendar',
      description: 'Agende lembretes de pagamentos automaticamente',
      icon: Calendar,
      color: '#4285F4',
      connected: status.google?.connected || false,
      message: status.google?.connected ? 'Via Google Workspace' : 'Conecte Google Workspace',
      features: [
        'Eventos de vencimento',
        'Lembretes automáticos',
        'Integração com Google Meet'
      ],
      configNeeded: true,
      requiresGoogle: true
    },
    {
      id: 'sheets',
      name: 'Google Sheets',
      description: 'Exporte seus investimentos para planilhas Google',
      icon: FileSpreadsheet,
      color: '#0F9D58',
      connected: status.google?.connected || false,
      message: status.google?.connected ? 'Via Google Workspace' : 'Conecte Google Workspace',
      features: [
        'Exportação automática',
        'Dashboards em tempo real',
        'Compartilhamento seguro'
      ],
      configNeeded: true,
      requiresGoogle: true
    },
    {
      id: 'drive',
      name: 'Google Drive',
      description: 'Armazene notas fiscais e boletos no Drive',
      icon: HardDrive,
      color: '#0066CC',
      connected: status.google?.connected || false,
      message: status.google?.connected ? 'Via Google Workspace' : 'Conecte Google Workspace',
      features: [
        'Upload de arquivos',
        'Organização por evento',
        'Acesso anywhere'
      ],
      configNeeded: true,
      requiresGoogle: true
    },
    {
      id: 'gmail',
      name: 'Gmail',
      description: 'Envie notificações e relatórios por email',
      icon: Mail,
      color: '#EA4335',
      connected: status.google?.connected || false,
      message: status.google?.connected ? 'Via Google Workspace' : 'Conecte Google Workspace',
      features: [
        'Notificações por email',
        'Relatórios automáticos',
        'Alertas de pagamento'
      ],
      configNeeded: true,
      requiresGoogle: true
    }
  ]

  const filteredIntegrations = integrations.filter(integration =>
    integration.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getStatusBadge = (integration: typeof integrations[0]) => {
    if (integration.connected) {
      return { label: 'Ativo', className: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' }
    }
    return { label: 'Não conectado', className: 'bg-red-50 text-red-500 dark:bg-red-900/30 dark:text-red-400' }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <TopNavBar session={session} currentPage="integracoes" />
      <SideNavBar onLogout={handleLogout} />

      <main className="pt-20 pb-8 px-4 md:px-6 lg:px-8 max-w-6xl mx-auto lg:ml-64">
        {/* Breadcrumb Header */}
        <div className="mb-6">
          <nav className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-2">
            <button onClick={onClose} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              <span className="material-symbols-outlined text-lg">arrow_back</span>
            </button>
            <span className="material-symbols-outlined text-sm">chevron_right</span>
            <span>Dashboard</span>
            <span className="material-symbols-outlined text-sm">chevron_right</span>
            <span className="text-gray-800 dark:text-white font-medium">Integrações</span>
          </nav>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white font-headline flex items-center gap-3">
                <span className="material-symbols-outlined text-3xl text-blue-600 dark:text-blue-400">hub</span>
                Integrações
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Conecte suas ferramentas para automatizar seu fluxo
              </p>
            </div>
          </div>
        </div>

        {/* Header Section */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white font-headline">
                Conecte suas ferramentas
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Integre com Slack, Google Calendar, Sheets, Drive e Gmail para otimizar seus fluxos
              </p>
            </div>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl">
                search
              </span>
              <input
                type="text"
                placeholder="Buscar integração..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2.5 w-full sm:w-64 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white placeholder-slate-400"
              />
            </div>
          </div>

          {/* Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredIntegrations.map((integration) => {
              const badge = getStatusBadge(integration)
              return (
                <div
                  key={integration.id}
                  className={`relative bg-white dark:bg-slate-800 rounded-2xl border p-5 flex flex-col gap-4 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${
                    integration.connected
                      ? 'border-emerald-200 dark:border-emerald-800 shadow-emerald-50 dark:shadow-emerald-950'
                      : 'border-slate-100 dark:border-slate-700'
                  }`}
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center shadow-sm"
                        style={{ backgroundColor: integration.color }}
                      >
                        <integration.icon size={22} color="white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white text-base font-headline leading-tight">
                          {integration.name}
                        </h3>
                        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full mt-1 ${badge.className}`}>
                          {integration.connected ? (
                            <CheckCircle size={11} />
                          ) : (
                            <AlertCircle size={11} />
                          )}
                          {badge.label}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                    {integration.description}
                  </p>

                  {/* Features */}
                  <div className="flex-1">
                    <h4 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-2">
                      Recursos disponíveis
                    </h4>
                    <ul className="space-y-1.5">
                      {integration.features.map((feature, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                          <Check size={14} className="text-emerald-500 flex-shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                    {integration.id === 'slack' && (
                      <button
                        onClick={testSlack}
                        disabled={testingSlack}
                        className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-700 dark:hover:bg-slate-200 transition-colors flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {testingSlack ? (
                          <>
                            <RefreshCw size={15} className="animate-spin" />
                            Testando...
                          </>
                        ) : (
                          <>
                            <MessageSquare size={15} />
                            Testar Conexão
                          </>
                        )}
                      </button>
                    )}

                    {integration.id === 'google' && !integration.connected && (
                      <button
                        onClick={connectGoogle}
                        className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold primary-gradient text-white shadow-lg shadow-blue-900/10 hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                      >
                        <ExternalLink size={15} />
                        Conectar Google
                      </button>
                    )}

                    {integration.id === 'google' && integration.connected && (
                      <button
                        onClick={disconnectGoogle}
                        className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors flex items-center justify-center gap-2"
                      >
                        <Unlink size={15} />
                        Desconectar
                      </button>
                    )}

                    {integration.requiresGoogle && !integration.connected && (
                      <button
                        className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed flex items-center justify-center gap-2"
                        disabled
                      >
                        <AlertCircle size={15} />
                        Conecte Google Workspace primeiro
                      </button>
                    )}

                    {integration.requiresGoogle && integration.connected && (
                      <div className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-2">
                        <Check size={15} />
                        Disponível via Google Workspace
                      </div>
                    )}
                  </div>

                  {/* Status Message */}
                  {integration.message && !integration.connected && (
                    <div className="flex items-start gap-2 bg-red-50 dark:bg-red-900/20 rounded-xl p-3 text-xs text-red-600 dark:text-red-400">
                      <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                      {integration.message}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {filteredIntegrations.length === 0 && (
            <div className="text-center py-12">
              <span className="material-symbols-outlined text-5xl text-slate-300 dark:text-slate-600 mb-3">search_off</span>
              <p className="text-slate-500 dark:text-slate-400 text-sm">Nenhuma integração encontrada.</p>
            </div>
          )}
        </div>

        {/* Help Section */}
        <div className="mt-8 p-6 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
          <h3 className="text-base font-bold text-gray-900 dark:text-white font-headline mb-2">
            Precisa de ajuda?
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            Para configurar essas integrações, você precisará de credenciais específicas:
          </p>
          <ul className="text-sm text-slate-500 dark:text-slate-400 mb-5 space-y-1.5 ml-4 list-disc">
            <li><strong className="text-slate-700 dark:text-slate-300">Slack:</strong> Criar um app em api.slack.com e obter o Bot Token (xoxp-...)</li>
            <li><strong className="text-slate-700 dark:text-slate-300">Google:</strong> Criar projeto no Google Cloud Console com OAuth 2.0 configurado</li>
          </ul>
          <div className="flex flex-wrap gap-3">
            <a
              href="https://console.cloud.google.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold primary-gradient text-white shadow-lg shadow-blue-900/10 hover:opacity-90 transition-opacity"
            >
              <ExternalLink size={15} />
              Google Cloud Console
            </a>
            <a
              href="https://api.slack.com/apps"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-700 dark:hover:bg-slate-200 transition-colors"
            >
              <ExternalLink size={15} />
              Slack API
            </a>
          </div>
        </div>
      </main>

      <BottomNavBar />
    </div>
  )
}
