import { useState, useEffect } from 'react'
import { Session } from '@supabase/supabase-js'
import { supabase } from '../App'
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import {
  Rocket, Plus, Download, LogOut, DollarSign, CheckCircle, Clock,
  TrendingUp, TrendingDown, RefreshCw, FileSpreadsheet, Search, Edit2, Settings, Users
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import InvestmentForm from './InvestmentForm'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const COLORS = {
  pendente: '#f59e0b',
  recebimento: '#3b82f6',
  aprovado: '#8b5cf6',
  pago: '#10b981',
}

const CATEGORIAS: Record<string, string> = {
  'ESPAÇO E INFRAESTRUTURA': '#0066CC',
  'CATERING E BEBIDAS': '#D97706',
  'DESLOCAMENTO E HOSPEDAGEM': '#0891B2',
  'PRESTAÇÃO DE SERVIÇOS': '#DB2777',
  'MATERIAIS E BRINDES': '#16A34A',
  'DECORAÇÃO E AMBIENTE': '#7C3AED',
}

// Função para formatar categoria para exibição
const formatCategoria = (categoria: string): string => {
  const labels: Record<string, string> = {
    'ESPAÇO E INFRAESTRUTURA': 'Espaço e Infraestrutura',
    'CATERING E BEBIDAS': 'Catering e Bebidas',
    'DESLOCAMENTO E HOSPEDAGEM': 'Deslocamento e Hospedagem',
    'PRESTAÇÃO DE SERVIÇOS': 'Prestação de Serviços',
    'MATERIAIS E BRINDES': 'Materiais e Brindes',
    'DECORAÇÃO E AMBIENTE': 'Decoração e Ambiente',
  }
  return labels[categoria] || categoria
}

// Função para formatar mês
const formatMes = (mes: string): string => {
  const labels: Record<string, string> = {
    'FEV_26': 'Fev/26',
    'MAR_26': 'Mar/26',
    'ABR_26': 'Abr/26',
    'MAI_26': 'Mai/26',
    'JUN_26': 'Jun/26',
    'JUL_26': 'Jul/26',
    'AGO_26': 'Ago/26',
    'SET_26': 'Set/26',
    'OUT_26': 'Out/26',
    'NOV_26': 'Nov/26',
    'DEZ_26': 'Dez/26',
  }
  return labels[mes] || mes
}

interface Investimento {
  id: string
  tipo_fornecedor: string
  nome_fornecedor: string
  descricao_despesa: string
  valor_orcado: number
  valor_realizado: number
  quantidade: number
  forma_pagamento: string
  numero_parcelas: number
  data_vencimento: string
  numero_nota_fiscal: string
  possui_boleto_nf: boolean
  categoria_detalhe: string
  subcategoria: string
  responsavel: string
  mes_referencia: string
  observacoes: string
  status: 'PENDENTE' | 'RECEBIDO' | 'APROVADO' | 'PAGO'
  created_at: string
}

interface DashboardProps {
  session: Session
}

export default function Dashboard({ session }: DashboardProps) {
  const navigate = useNavigate()
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [investimentos, setInvestimentos] = useState<Investimento[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [filtroMes, setFiltroMes] = useState<string>('TODOS')
  const [filtroStatus, setFiltroStatus] = useState<string>('TODOS')
  const [filtroCategoria, setFiltroCategoria] = useState<string>('TODOS')
  const [googleStatus, setGoogleStatus] = useState<{connected: boolean}>({connected: false})
  const [exporting, setExporting] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [investimentoEditando, setInvestimentoEditando] = useState<Investimento | null>(null)
  const [termoBusca, setTermoBusca] = useState('')

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  useEffect(() => {
    fetchInvestimentos()
    checkGoogleStatus()
  }, [session])

  const fetchInvestimentos = async () => {
    try {
      const { data, error } = await supabase
        .from('investimentos')
        .select('*')
        .order('data_vencimento', { ascending: true })

      if (error) throw error
      setInvestimentos(data || [])
    } catch (err) {
      console.error('Erro ao buscar investimentos:', err)
    } finally {
      setLoading(false)
    }
  }

  const checkGoogleStatus = async () => {
    try {
      const res = await fetch(`${API_URL}/google/status`)
      const data = await res.json()
      setGoogleStatus(data)
    } catch {}
  }

  const investimentosFiltrados = investimentos.filter(i => {
    if (filtroMes !== 'TODOS' && i.mes_referencia !== filtroMes) return false
    if (filtroStatus !== 'TODOS' && i.status !== filtroStatus) return false
    if (filtroCategoria !== 'TODOS' && i.tipo_fornecedor !== filtroCategoria) return false
    if (termoBusca) {
      const busca = termoBusca.toLowerCase()
      if (!i.nome_fornecedor.toLowerCase().includes(busca) &&
          !i.descricao_despesa.toLowerCase().includes(busca)) return false
    }
    return true
  })

  const totalOrcado = investimentosFiltrados.reduce((acc, i) => acc + Number(i.valor_orcado), 0)
  const totalRealizado = investimentosFiltrados.reduce((acc, i) => acc + Number(i.valor_realizado), 0)
  const totalPago = investimentosFiltrados.filter(i => i.status === 'PAGO').reduce((acc, i) => acc + Number(i.valor_realizado), 0)
  const pendentes = investimentosFiltrados.filter(i => i.status === 'PENDENTE').length
  const pagos = investimentosFiltrados.filter(i => i.status === 'PAGO').length

  // Indicadores (comparação简单)
  const orcadoVsRealizado = totalOrcado > 0 ? ((totalRealizado / totalOrcado) * 100).toFixed(1) : '0'
  const pagoPercent = totalRealizado > 0 ? ((totalPago / totalRealizado) * 100).toFixed(1) : '0'

  const dadosPorCategoria = Object.entries(
    investimentosFiltrados.reduce((acc, i) => {
      acc[i.tipo_fornecedor] = (acc[i.tipo_fornecedor] || 0) + Number(i.valor_realizado)
      return acc
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value }))

  const dadosPorStatus = [
    { name: 'Pendente', value: investimentosFiltrados.filter(i => i.status === 'PENDENTE').length },
    { name: 'Recebido', value: investimentosFiltrados.filter(i => i.status === 'RECEBIDO').length },
    { name: 'Aprovado', value: investimentosFiltrados.filter(i => i.status === 'APROVADO').length },
    { name: 'Pago', value: investimentosFiltrados.filter(i => i.status === 'PAGO').length },
  ]

  const dadosMensais = Object.entries(
    investimentosFiltrados.reduce((acc, i) => {
      acc[i.mes_referencia] = (acc[i.mes_referencia] || 0) + Number(i.valor_realizado)
      return acc
    }, {} as Record<string, number>)
  ).map(([mes, valor]) => ({ mes: mes.replace('_', ' '), valor }))

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  const handleStatusChange = async (id: string, newStatus: string) => {
    await supabase
      .from('investimentos')
      .update({ status: newStatus })
      .eq('id', id)

    // Sincronizar com Sheets automaticamente
    try {
      await fetch(`${API_URL}/sheets/atualizar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
    } catch {}

    fetchInvestimentos()
    setEditandoId(null)
  }

  const handleEdit = (investimento: Investimento) => {
    setInvestimentoEditando(investimento)
    setShowForm(true)
  }

  const handleCloseForm = () => {
    setShowForm(false)
    setInvestimentoEditando(null)
    fetchInvestimentos()
  }

  const exportToSheets = async () => {
    if (!googleStatus.connected) {
      window.open(`${API_URL}/google/authorize`, '_blank')
      return
    }
    setExporting(true)
    try {
      const res = await fetch(`${API_URL}/sheets/atualizar`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'}
      })
      const data = await res.json()
      if (data.url || data.spreadsheetId) {
        // Abre a planilha na aba correta (gid=2083282215)
        const url = `https://docs.google.com/spreadsheets/d/1-ftcCGe1Zoapmo6dAdygxs3FS91liAmrGOITbpBc0MU/edit?gid=2083282215`
        window.open(url, '_blank')
        alert(data.message || 'Planilha atualizada!')
      } else {
        alert('Erro: ' + JSON.stringify(data))
      }
    } catch {
      alert('Erro ao conectar com servidor')
    } finally {
      setExporting(false)
    }
  }

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{background: 'var(--bg-primary)'}}>
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2" style={{borderColor: 'var(--solarz-blue)'}}></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{background: 'var(--bg-primary)'}}>
      {/* Header */}
      <header className="header">
        <div className="header-content">
          <div className="logo-section">
            <div className="logo-icon">
              <Rocket size={20} />
            </div>
            <div className="logo-text">
              <h1>Galaxy Finance</h1>
              <p>Controle Financeiro - Imersão Galaxy</p>
            </div>
          </div>
          <div className="header-actions">
            <span className="date-display">{format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}</span>
            <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} className="theme-toggle" title="Alternar tema" />
            <button onClick={fetchInvestimentos} className="btn btn-secondary">
              <RefreshCw size={16} />
            </button>
            <button onClick={exportToSheets} disabled={exporting} className="btn btn-secondary">
              <FileSpreadsheet size={16} />
              {exporting ? '...' : 'Exportar'}
            </button>
            <button onClick={() => navigate('/usuarios')} className="btn btn-secondary" title="Usuários">
              <Users size={16} />
            </button>
            <button onClick={() => navigate('/cadastros')} className="btn btn-secondary" title="Cadastros">
              <Settings size={16} />
            </button>
            <button onClick={() => setShowForm(true)} className="btn btn-primary">
              <Plus size={16} />
              Novo
            </button>
            {/* User Profile */}
            <div className="user-profile">
              {session.user.user_metadata?.avatar_url ? (
                <img
                  src={session.user.user_metadata.avatar_url}
                  alt={session.user.user_metadata?.name || 'User'}
                  className="user-avatar"
                />
              ) : (
                <div className="user-avatar-placeholder">
                  {(session.user.user_metadata?.name || session.user.email || 'U').charAt(0).toUpperCase()}
                </div>
              )}
              <span className="user-name">{session.user.user_metadata?.name || session.user.email?.split('@')[0]}</span>
            </div>
            <button onClick={handleLogout} className="btn btn-secondary">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      <div className="main-content">
        {/* Cards de Métricas */}
        <div className="metrics-grid">
          <MetricCard
            title="Total Orçado"
            value={totalOrcado}
            icon={DollarSign}
            color="#0066CC"
            indicator={`${investimentosFiltrados.length} itens`}
          />
          <MetricCard
            title="Total Realizado"
            value={totalRealizado}
            icon={TrendingUp}
            color="#0066CC"
            indicator={`${orcadoVsRealizado}% do orçado`}
          />
          <MetricCard
            title="Total Pago"
            value={totalPago}
            icon={CheckCircle}
            color="#10B981"
            indicator={`${pagoPercent}% realizado`}
          />
          <MetricCard
            title="Pendente"
            value={totalOrcado - totalPago}
            icon={Clock}
            color="#F59E0B"
            indicator={`${pendentes} itens`}
          />
        </div>

        {/* Filtros */}
        <div className="filters-bar">
          <div className="filter-group">
            <Search size={16} style={{color: 'var(--text-secondary)'}} />
            <input
              type="text"
              placeholder="Buscar..."
              value={termoBusca}
              onChange={(e) => setTermoBusca(e.target.value)}
              className="search-input"
            />
          </div>
          <div className="filter-group">
            <span className="filter-label">Mês:</span>
            <select value={filtroMes} onChange={(e) => setFiltroMes(e.target.value)} className="filter-select">
              <option value="TODOS">Todos</option>
              {['FEV_26', 'MAR_26', 'ABR_26', 'MAI_26', 'JUN_26', 'JUL_26', 'AGO_26', 'SET_26', 'OUT_26', 'NOV_26', 'DEZ_26'].map(mes => (
                <option key={mes} value={mes}>{formatMes(mes)}</option>
              ))}
            </select>
          </div>
          <div className="filter-group">
            <span className="filter-label">Status:</span>
            <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)} className="filter-select">
              <option value="TODOS">Todos</option>
              <option value="PENDENTE">Pendente</option>
              <option value="RECEBIDO">Recebido</option>
              <option value="APROVADO">Aprovado</option>
              <option value="PAGO">Pago</option>
            </select>
          </div>
          <div className="filter-group">
            <span className="filter-label">Categoria:</span>
            <select value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value)} className="filter-select">
              <option value="TODOS">Todas</option>
              {Object.keys(CATEGORIAS).map(cat => (
                <option key={cat} value={cat}>{formatCategoria(cat)}</option>
              ))}
            </select>
          </div>
          {(filtroMes !== 'TODOS' || filtroStatus !== 'TODOS' || filtroCategoria !== 'TODOS' || termoBusca) && (
            <button
              onClick={() => {setFiltroMes('TODOS'); setFiltroStatus('TODOS'); setFiltroCategoria('TODOS'); setTermoBusca('')}}
              style={{color: 'var(--danger)', fontSize: '0.875rem', background: 'none', border: 'none', cursor: 'pointer'}}
            >
              Limpar
            </button>
          )}
        </div>

        {/* Gráficos */}
        <div className="charts-grid">
          <div className="chart-card">
            <h3 className="chart-title">Por Categoria</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={dadosPorCategoria}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                  label={({name, percent}) => `${name.substring(0, 10)} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {dadosPorCategoria.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CATEGORIAS[entry.name] || '#6366f1'} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR')}`} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-card">
            <h3 className="chart-title">Evolução por Mês</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={dadosMensais}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="mes" stroke="var(--text-secondary)" fontSize={12} />
                <YAxis stroke="var(--text-secondary)" fontSize={12} tickFormatter={(v) => `R$ ${v/1000}k`} />
                <Tooltip formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR')}`} />
                <Bar dataKey="valor" fill="#0066CC" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tabela */}
        <div className="table-card">
          <div className="table-header">
            <h3 className="table-title">Investimentos ({investimentosFiltrados.length})</h3>
          </div>
          <div style={{overflowX: 'auto'}}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Fornecedor</th>
                  <th>Categoria</th>
                  <th>Data Vencimento</th>
                  <th>Valor</th>
                  <th>Status</th>
                  <th>Responsável</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {investimentosFiltrados.map((investimento) => (
                  <tr key={investimento.id}>
                    <td>
                      <div style={{fontWeight: 600}}>{investimento.nome_fornecedor}</div>
                      <div style={{fontSize: '0.75rem', color: 'var(--text-secondary)'}}>{investimento.descricao_despesa}</div>
                    </td>
                    <td>
                      <span
                        className="category-tag"
                        style={{
                          backgroundColor: `${CATEGORIAS[investimento.tipo_fornecedor]}15`,
                          color: CATEGORIAS[investimento.tipo_fornecedor]
                        }}
                      >
                        {formatCategoria(investimento.tipo_fornecedor)}
                      </span>
                    </td>
                    <td style={{color: 'var(--text-secondary)'}}>
                      {format(new Date(investimento.data_vencimento), 'dd/MM/yyyy', { locale: ptBR })}
                    </td>
                    <td>
                      <div className="value-cell">R$ {Number(investimento.valor_realizado).toLocaleString('pt-BR')}</div>
                      <div className="value-small">Orçado: R$ {Number(investimento.valor_orcado).toLocaleString('pt-BR')}</div>
                    </td>
                    <td>
                      {editandoId === investimento.id ? (
                        <select
                          value={investimento.status}
                          onChange={(e) => handleStatusChange(investimento.id, e.target.value)}
                          onBlur={() => setEditandoId(null)}
                          autoFocus
                          className="filter-select"
                        >
                          <option value="PENDENTE">Pendente</option>
                          <option value="RECEBIDO">Recebido</option>
                          <option value="APROVADO">Aprovado</option>
                          <option value="PAGO">Pago</option>
                        </select>
                      ) : (
                        <span
                          onClick={() => setEditandoId(investimento.id)}
                          className={`status-badge ${investimento.status.toLowerCase()} cursor-pointer`}
                        >
                          {investimento.status}
                        </span>
                      )}
                    </td>
                    <td>
                      <div className="responsavel-cell">
                        {investimento.responsavel_avatar ? (
                          <img
                            src={investimento.responsavel_avatar}
                            alt={investimento.responsavel}
                            className="avatar-img"
                          />
                        ) : (
                          <div className="avatar">{getInitials(investimento.responsavel)}</div>
                        )}
                        <span style={{fontSize: '0.875rem'}}>{investimento.responsavel}</span>
                      </div>
                    </td>
                    <td>
                      <button
                        onClick={() => handleEdit(investimento)}
                        className="btn-edit"
                        title="Editar investimento"
                      >
                        <Edit2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
                {investimentosFiltrados.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)'}}>
                      Nenhum investimento encontrado
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showForm && (
        <InvestmentForm
          session={session}
          onClose={handleCloseForm}
          investimento={investimentoEditando}
        />
      )}
    </div>
  )
}

function MetricCard({ title, value, icon: Icon, color, indicator }: {
  title: string
  value: number
  icon: any
  color: string
  indicator: string
}) {
  return (
    <div className="metric-card">
      <div className="metric-header">
        <span className="metric-label">{title}</span>
        <div className="metric-icon" style={{background: `${color}15`, color}}>
          <Icon size={18} />
        </div>
      </div>
      <div className="metric-value">R$ {value.toLocaleString('pt-BR')}</div>
      <div className="metric-indicator" style={{color: color}}>
        {indicator}
      </div>
    </div>
  )
}
