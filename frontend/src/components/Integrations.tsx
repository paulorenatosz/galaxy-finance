import { useState, useEffect } from 'react'
import { Session } from '@supabase/supabase-js'
import {
  X, Check, AlertCircle, ExternalLink, RefreshCw, Calendar, FileSpreadsheet,
  Mail, HardDrive, MessageSquare, Link2, Unlink, CheckCircle
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

  return (
    <div className="cadastros-container">
      <header className="cadastros-header">
        <div className="header-content">
          <div className="logo-section">
            <div className="logo-icon">
              <Link2 size={20} />
            </div>
            <div className="logo-text">
              <h1>Integrações</h1>
              <p>Conecte ferramentas para automatizar seu fluxo</p>
            </div>
          </div>
          <button onClick={onClose} className="btn btn-secondary">
            <X size={16} />
            Voltar
          </button>
        </div>
      </header>

      <div className="tab-content">
        <div className="integrations-grid">
          {integrations.map(integration => (
            <div key={integration.id} className={`integration-card ${integration.connected ? 'connected' : ''}`}>
              <div className="integration-header">
                <div className="integration-icon" style={{ backgroundColor: integration.color }}>
                  <integration.icon size={24} color="white" />
                </div>
                <div className="integration-info">
                  <h3>{integration.name}</h3>
                  <span className={`status-badge ${integration.connected ? 'connected' : 'disconnected'}`}>
                    {integration.connected ? (
                      <>
                        <CheckCircle size={14} />
                        Conectado
                      </>
                    ) : (
                      <>
                        <AlertCircle size={14} />
                        Não conectado
                      </>
                    )}
                  </span>
                </div>
              </div>

              <p className="integration-description">{integration.description}</p>

              <div className="integration-features">
                <h4>Recursos disponíveis:</h4>
                <ul>
                  {integration.features.map((feature, i) => (
                    <li key={i}>
                      <Check size={14} />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="integration-actions">
                {integration.id === 'slack' && (
                  <button
                    onClick={testSlack}
                    disabled={testingSlack}
                    className="btn btn-primary"
                  >
                    {testingSlack ? (
                      <>
                        <RefreshCw size={16} className="spin" />
                        Testando...
                      </>
                    ) : (
                      <>
                        <MessageSquare size={16} />
                        Testar Conexão
                      </>
                    )}
                  </button>
                )}

                {integration.id === 'google' && !integration.connected && (
                  <button
                    onClick={connectGoogle}
                    className="btn btn-primary"
                  >
                    <ExternalLink size={16} />
                    Conectar Google
                  </button>
                )}

                {integration.id === 'google' && integration.connected && (
                  <button
                    onClick={disconnectGoogle}
                    className="btn btn-secondary"
                  >
                    <Unlink size={16} />
                    Desconectar
                  </button>
                )}

                {integration.requiresGoogle && !integration.connected && (
                  <button
                    onClick={connectGoogle}
                    className="btn btn-secondary"
                    disabled
                  >
                    <AlertCircle size={16} />
                    Conecte Google Workspace primeiro
                  </button>
                )}

                {integration.requiresGoogle && integration.connected && (
                  <button className="btn btn-primary" disabled>
                    <Check size={16} />
                    Disponível
                  </button>
                )}
              </div>

              {integration.message && !integration.connected && (
                <div className="integration-message">
                  <AlertCircle size={14} />
                  {integration.message}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="integration-help">
          <h3>Precisa de ajuda?</h3>
          <p>Para configurar essas integrações, você precisará:</p>
          <ul>
            <li><strong>Slack:</strong> Criar um app em api.slack.com e obter o Bot Token</li>
            <li><strong>Google:</strong> Criar projeto no Google Cloud Console com OAuth</li>
          </ul>
          <div className="help-links">
            <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer">
              <ExternalLink size={14} />
              Google Cloud Console
            </a>
            <a href="https://api.slack.com/apps" target="_blank" rel="noopener noreferrer">
              <ExternalLink size={14} />
              Slack API
            </a>
          </div>
        </div>
      </div>

      <style>{`
        .integrations-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
          gap: 20px;
          margin-top: 20px;
        }

        .integration-card {
          background: var(--bg-secondary, #1a1a2e);
          border: 1px solid var(--border-color, #2d2d44);
          border-radius: 12px;
          padding: 20px;
          transition: all 0.3s ease;
        }

        .integration-card.connected {
          border-color: #10b981;
        }

        .integration-header {
          display: flex;
          align-items: center;
          gap: 15px;
          margin-bottom: 15px;
        }

        .integration-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .integration-info h3 {
          margin: 0 0 5px 0;
          font-size: 18px;
          color: var(--text-primary, #fff);
        }

        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 12px;
          padding: 4px 8px;
          border-radius: 12px;
        }

        .status-badge.connected {
          background: rgba(16, 185, 129, 0.2);
          color: #10b981;
        }

        .status-badge.disconnected {
          background: rgba(239, 68, 68, 0.2);
          color: #ef4444;
        }

        .integration-description {
          color: var(--text-secondary, #9ca3af);
          font-size: 14px;
          margin-bottom: 15px;
        }

        .integration-features {
          margin-bottom: 15px;
        }

        .integration-features h4 {
          font-size: 13px;
          color: var(--text-secondary, #9ca3af);
          margin-bottom: 10px;
        }

        .integration-features ul {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .integration-features li {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          color: var(--text-primary, #d1d5db);
          margin-bottom: 6px;
        }

        .integration-features li svg {
          color: #10b981;
        }

        .integration-actions {
          display: flex;
          gap: 10px;
          margin-top: 15px;
        }

        .integration-message {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 10px;
          padding: 10px;
          background: rgba(239, 68, 68, 0.1);
          border-radius: 8px;
          font-size: 12px;
          color: #ef4444;
        }

        .integration-help {
          margin-top: 40px;
          padding: 20px;
          background: var(--bg-secondary, #1a1a2e);
          border-radius: 12px;
          border: 1px solid var(--border-color, #2d2d44);
        }

        .integration-help h3 {
          margin: 0 0 10px 0;
          color: var(--text-primary, #fff);
        }

        .integration-help p {
          color: var(--text-secondary, #9ca3af);
          margin-bottom: 15px;
        }

        .integration-help ul {
          color: var(--text-secondary, #9ca3af);
          margin-left: 20px;
        }

        .integration-help li {
          margin-bottom: 8px;
        }

        .help-links {
          display: flex;
          gap: 15px;
          margin-top: 15px;
        }

        .help-links a {
          display: flex;
          align-items: center;
          gap: 5px;
          color: #4285F4;
          text-decoration: none;
          font-size: 14px;
        }

        .help-links a:hover {
          text-decoration: underline;
        }

        .spin {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}