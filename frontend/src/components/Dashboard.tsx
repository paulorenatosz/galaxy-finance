import { useState, useEffect } from 'react'
import { Session } from '@supabase/supabase-js'
import { supabase } from '../App'
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import {
  Rocket, Plus, Download, LogOut, DollarSign, CheckCircle, Clock,
  TrendingUp, TrendingDown, RefreshCw, FileSpreadsheet, Search, Edit2, Settings, Users, Calendar, Link2, Upload, Database, Trash2, X
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import InvestmentForm from './InvestmentForm'
import TopNavBar from './layout/TopNavBar'
import SideNavBar from './layout/SideNavBar'
import BottomNavBar from './layout/BottomNavBar'

// Configuração do Supabase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

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

// Função para formatar nome do evento
const formatEventoNome = (evento: Evento): string => {
  const anoStr = evento.ano.toString().slice(-2) // "2026" -> "26"

  if (evento.tipo === 'Imersão Galaxy') {
    return `Galaxy ${evento.subevento} ${anoStr}`
  } else if (evento.tipo === 'Intersolar') {
    return `Intersolar ${evento.subevento} ${anoStr}`
  } else if (evento.tipo === 'SolarZ Awards') {
    return `SolarZ Awards ${anoStr}`
  }
  return evento.nome
}

interface Evento {
  id: string
  nome: string
  tipo: string
  subevento: string
  ano: number
  status: string
}

interface Investimento {
  id: string
  evento_id: string | null
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
  // Dados do fornecedor
  fornecedor_email?: string
  fornecedor_telefone?: string
}

interface Fornecedor {
  id: string
  nome: string
  email: string | null
  telefone: string | null
}

interface Funcionario {
  id: string
  nome: string
  cpf: string
  email: string
  telefone: string
  data_nascimento: string
}

interface Passagem {
  id: string
  tipo: string
  nome_passageiro: string
  cpf: string
  data_ida: string
  hora_ida: string
  trecho_ida: string
  data_volta: string
  hora_volta: string
  trecho_volta: string
  valor: number
  evento: string
}

interface DashboardProps {
  session: Session
}

export default function Dashboard({ session }: DashboardProps) {
  const navigate = useNavigate()
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [eventos, setEventos] = useState<Evento[]>([])
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([])
  const [anoSelecionado, setAnoSelecionado] = useState<number>(new Date().getFullYear())
  const [eventoSelecionado, setEventoSelecionado] = useState<string>('todos')
  const [tipoEventoAberto, setTipoEventoAberto] = useState<string | null>(null)
  const [investimentos, setInvestimentos] = useState<Investimento[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [filtroMes, setFiltroMes] = useState<string>('TODOS')
  const [filtroStatus, setFiltroStatus] = useState<string>('TODOS')
  const [filtroCategoria, setFiltroCategoria] = useState<string>('TODOS')
  const [exporting, setExporting] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [investimentoEditando, setInvestimentoEditando] = useState<Investimento | null>(null)
  const [termoBusca, setTermoBusca] = useState('')
  const [subTab, setSubTab] = useState<'investimentos' | 'funcionarios' | 'passagens'>('investimentos')
  const [funcionarios, setFuncionarios] = useState<any[]>([])
  const [passagens, setPassagens] = useState<any[]>([])
  const [funcionarioEditando, setFuncionarioEditando] = useState<Funcionario | null>(null)
  const [passagemEditando, setPassagemEditando] = useState<Passagem | null>(null)

  // Função segura para formatar datas
  const safeFormatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '-'
    try {
      const d = new Date(dateStr)
      if (isNaN(d.getTime())) return dateStr
      return d.toLocaleDateString('pt-BR')
    } catch {
      return dateStr
    }
  }

  // Filtrar eventos por ano selecionado
  const eventosDoAno = eventos.filter(e => e.ano === anoSelecionado)

  // Agrupar eventos por tipo
  const eventosPorTipo = eventosDoAno.reduce((acc, evento) => {
    if (!acc[evento.tipo]) acc[evento.tipo] = []
    acc[evento.tipo].push(evento)
    return acc
  }, {} as Record<string, Evento[]>)

  const tiposEvento = Object.keys(eventosPorTipo)

  // Anos disponíveis
  const anosDisponiveis = [...new Set(eventos.map(e => e.ano))].sort((a, b) => b - a)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  useEffect(() => {
    fetchEventos()
    fetchInvestimentos()
    fetchFuncionariosPassagens()
  }, [session])

  useEffect(() => {
    fetchInvestimentos()
  }, [eventoSelecionado])

  const fetchEventos = async () => {
    try {
      const { data: eventosData, error: eventosError } = await supabase
        .from('eventos')
        .select('*')
        .eq('status', 'ativo')
        .order('nome')

      if (eventosError) throw eventosError
      setEventos(eventosData || [])

      // Buscar fornecedores para exibir na tabela
      const { data: fornecedoresData } = await supabase
        .from('fornecedores')
        .select('id, nome, email, telefone')
        .eq('status', 'ativo')
        .order('nome')

      if (fornecedoresData) {
        setFornecedores(fornecedoresData)
      }
    } catch (err) {
      console.error('Erro ao buscar eventos:', err)
    }
  }

  const fetchInvestimentos = async () => {
    try {
      let query = supabase
        .from('investimentos')
        .select('*')
        .order('data_vencimento', { ascending: true })

      if (eventoSelecionado !== 'todos') {
        query = query.eq('evento_id', eventoSelecionado)
      }

      const { data, error } = await query

      if (error) throw error
      setInvestimentos(data || [])
    } catch (err) {
      console.error('Erro ao buscar investimentos:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchFuncionariosPassagens = async () => {
    try {
      // Buscar funcionários
      const { data: funcData } = await supabase
        .from('funcionarios')
        .select('*')
        .order('nome')
      setFuncionarios(funcData || [])

      // Buscar passagens
      const { data: passData } = await supabase
        .from('passagens')
        .select('*')
        .order('data_ida', { ascending: false })
      setPassagens(passData || [])
    } catch (err) {
      console.error('Erro ao buscar dados:', err)
    }
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

  const handleDeleteInvestimento = async (id: string) => {
    const adminKey = prompt('Acesso Restrito: Digite a senha Admin para excluir')
    if (!adminKey) return

    try {
      // Usar a mesma rota de validacao de convites para confirmar a senha
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/convites/listar?admin_key=${adminKey}`)
      if (!res.ok) {
        alert('Senha de administrador incorreta!')
        return
      }

      if (!confirm('Tem CERTEZA absoluta que deseja excluir este investimento permanentemente?')) return

      const { error } = await supabase.from('investimentos').delete().eq('id', id)
      if (error) throw error

      setInvestimentos(investimentos.filter(i => i.id !== id))
    } catch (err) {
      console.error('Erro ao excluir:', err)
      alert('Erro ao excluir investimento')
    }
  }

  const handleDeleteFuncionario = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este funcionário?')) return
    try {
      await supabase.from('funcionarios').delete().eq('id', id)
      setFuncionarios(funcionarios.filter(f => f.id !== id))
    } catch (err) {
      console.error('Erro ao excluir:', err)
      alert('Erro ao excluir funcionário')
    }
  }

  const handleSaveFuncionario = async () => {
    if (!funcionarioEditando) return
    try {
      const { error } = await supabase
        .from('funcionarios')
        .update({
          nome: funcionarioEditando.nome,
          cpf: funcionarioEditando.cpf,
          email: funcionarioEditando.email,
          telefone: funcionarioEditando.telefone,
          updated_at: new Date().toISOString()
        })
        .eq('id', funcionarioEditando.id)

      if (error) throw error

      setFuncionarios(funcionarios.map(f =>
        f.id === funcionarioEditando.id ? funcionarioEditando : f
      ))
      setFuncionarioEditando(null)
    } catch (err) {
      console.error('Erro ao salvar:', err)
      alert('Erro ao salvar funcionário')
    }
  }

  const handleDeletePassagem = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta passagem?')) return
    try {
      await supabase.from('passagens').delete().eq('id', id)
      setPassagens(passagens.filter(p => p.id !== id))
    } catch (err) {
      console.error('Erro ao excluir:', err)
      alert('Erro ao excluir passagem')
    }
  }

  const handleSavePassagem = async () => {
    if (!passagemEditando) return
    try {
      const { error } = await supabase
        .from('passagens')
        .update({
          nome_passageiro: passagemEditando.nome_passageiro,
          tipo: passagemEditando.tipo,
          data_ida: passagemEditando.data_ida,
          hora_ida: passagemEditando.hora_ida,
          trecho_ida: passagemEditando.trecho_ida,
          data_volta: passagemEditando.data_volta,
          hora_volta: passagemEditando.hora_volta,
          trecho_volta: passagemEditando.trecho_volta,
          valor: passagemEditando.valor,
          evento: passagemEditando.evento,
          updated_at: new Date().toISOString()
        })
        .eq('id', passagemEditando.id)

      if (error) throw error

      setPassagens(passagens.map(p =>
        p.id === passagemEditando.id ? passagemEditando : p
      ))
      setPassagemEditando(null)
    } catch (err) {
      console.error('Erro ao salvar:', err)
      alert('Erro ao salvar passagem')
    }
  }

  const exportToSheets = async () => {
    alert('Funcionalidade de exportação para Google Sheets em desenvolvimento. Os dados estão salvos no banco de dados.')
  }

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-inter">
      {/* Layout wrappers */}
      <TopNavBar session={session} currentPage="dashboard" />
      <SideNavBar onLogout={handleLogout} />

      {/* Main content area */}
      <main className="lg:ml-64 pt-16 min-h-screen pb-20 lg:pb-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Page Header */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white font-headline">Financeiro Marketing</h1>
              <p className="text-sm text-on-surface-variant mt-0.5">{format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {/* Year Selector */}
              <select
                value={anoSelecionado}
                onChange={(e) => {
                  setAnoSelecionado(Number(e.target.value))
                  setEventoSelecionado('todos')
                  setTipoEventoAberto(null)
                }}
                className="text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                {anosDisponiveis.map(ano => (
                  <option key={ano} value={ano}>{ano}</option>
                ))}
              </select>

              {/* Event selector buttons */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => { setEventoSelecionado('todos'); setTipoEventoAberto(null); }}
                  className={`text-sm px-3 py-2 rounded-lg border transition-all ${eventoSelecionado === 'todos' ? 'bg-blue-600 text-white border-blue-600 font-semibold' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-blue-400 hover:text-blue-600'}`}
                >
                  Todos os Eventos
                </button>
                {tiposEvento.map(tipo => (
                  <div key={tipo} style={{ position: 'relative' }}>
                    <button
                      onClick={() => setTipoEventoAberto(tipoEventoAberto === tipo ? null : tipo)}
                      className={`text-sm px-3 py-2 rounded-lg border transition-all flex items-center gap-1 ${tipoEventoAberto === tipo || eventosPorTipo[tipo]?.some(e => e.id === eventoSelecionado) ? 'bg-blue-600 text-white border-blue-600 font-semibold' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-blue-400 hover:text-blue-600'}`}
                    >
                      {tipo}
                      <span className="text-xs">&#x25BE;</span>
                    </button>
                    {tipoEventoAberto === tipo && (
                      <div className="absolute top-full left-0 mt-1 bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-100 dark:border-slate-800 py-1 min-w-[200px] z-50">
                        {eventosPorTipo[tipo]?.map(evento => (
                          <button
                            key={evento.id}
                            onClick={() => { setEventoSelecionado(evento.id); setTipoEventoAberto(null); }}
                            className={`block w-full text-left px-4 py-2 text-sm transition-colors ${eventoSelecionado === evento.id ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-semibold' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                          >
                            {formatEventoNome(evento)}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2">
                <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors" title="Alternar tema">
                  <span className="material-symbols-outlined text-xl">{theme === 'light' ? 'dark_mode' : 'light_mode'}</span>
                </button>
                <button onClick={fetchInvestimentos} className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors" title="Atualizar">
                  <RefreshCw size={18} />
                </button>
                <button onClick={exportToSheets} disabled={exporting} className="flex items-center gap-2 text-sm px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                  <FileSpreadsheet size={16} />
                  {exporting ? '...' : 'Exportar'}
                </button>
                <button onClick={() => setShowForm(true)} className="primary-gradient text-white text-sm px-4 py-2 rounded-lg font-semibold flex items-center gap-2 shadow-lg shadow-blue-900/10 transition-all hover:shadow-xl hover:shadow-blue-900/20">
                  <span className="material-symbols-outlined text-sm">add</span>
                  Novo
                </button>
                <div className="w-9 h-9 rounded-full bg-blue-600 overflow-hidden border-2 border-white dark:border-slate-800 shadow">
                  {session.user.user_metadata?.avatar_url ? (
                    <img src={session.user.user_metadata.avatar_url} alt={session.user.user_metadata?.name || 'User'} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs font-bold text-white">
                      {(session.user.user_metadata?.name || session.user.email || 'U').charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-slate-500 dark:text-slate-400 font-headline">Total Orcado</span>
                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                  <span className="material-symbols-outlined text-blue-600 dark:text-blue-400" style={{fontSize: '20px'}}>account_balance_wallet</span>
                </div>
              </div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white font-headline mb-1">R$ {totalOrcado.toLocaleString('pt-BR')}</div>
              <div className="text-xs text-slate-400 font-inter">{investimentosFiltrados.length} itens orcados</div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-slate-500 dark:text-slate-400 font-headline">Total Realizado</span>
                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                  <span className="material-symbols-outlined text-blue-600 dark:text-blue-400" style={{fontSize: '20px'}}>stacked_line_chart</span>
                </div>
              </div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white font-headline mb-1">R$ {totalRealizado.toLocaleString('pt-BR')}</div>
              <div className="text-xs text-blue-600 dark:text-blue-400 font-inter font-semibold">{orcadoVsRealizado}% do orcado</div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-slate-500 dark:text-slate-400 font-headline">Total Pago</span>
                <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center">
                  <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400" style={{fontSize: '20px'}}>check_circle</span>
                </div>
              </div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white font-headline mb-1">R$ {totalPago.toLocaleString('pt-BR')}</div>
              <div className="text-xs text-emerald-600 dark:text-emerald-400 font-inter font-semibold">{pagoPercent}% realizado</div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-slate-500 dark:text-slate-400 font-headline">Pendente</span>
                <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center">
                  <span className="material-symbols-outlined text-amber-500 dark:text-amber-400" style={{fontSize: '20px'}}>schedule</span>
                </div>
              </div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white font-headline mb-1">R$ {(totalOrcado - totalPago).toLocaleString('pt-BR')}</div>
              <div className="text-xs text-amber-500 dark:text-amber-400 font-inter font-semibold">{pendentes} itens pendentes</div>
            </div>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-semibold text-slate-800 dark:text-white font-headline mb-4">Por Categoria</h3>
              {dadosPorCategoria.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={dadosPorCategoria} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value" label={({name, percent}) => `${name.substring(0, 12)} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                        {dadosPorCategoria.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={CATEGORIAS[entry.name] || '#6366f1'} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR')}`} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {dadosPorCategoria.map((entry) => (
                      <div key={entry.name} className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{background: CATEGORIAS[entry.name] || '#6366f1'}} />
                        <span className="text-xs text-slate-600 dark:text-slate-400 truncate font-inter">{formatCategoria(entry.name)}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                  <span className="material-symbols-outlined text-4xl mb-2">pie_chart</span>
                  <p className="text-sm font-inter">Sem dados para exibir</p>
                </div>
              )}
            </div>

            <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-semibold text-slate-800 dark:text-white font-headline mb-4">Evolucao por Mes</h3>
              {dadosMensais.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={dadosMensais} barCategoryGap="30%">
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                    <XAxis dataKey="mes" stroke="var(--text-secondary)" fontSize={12} />
                    <YAxis stroke="var(--text-secondary)" fontSize={11} tickFormatter={(v) => `R$ ${v/1000}k`} />
                    <Tooltip formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR')}`} />
                    <Bar dataKey="valor" fill="#0066CC" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                  <span className="material-symbols-outlined text-4xl mb-2">bar_chart</span>
                  <p className="text-sm font-inter">Sem dados para exibir</p>
                </div>
              )}
            </div>
          </div>

          {/* Filters bar */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 flex-1 min-w-[200px]">
              <Search size={15} className="text-slate-400 flex-shrink-0" />
              <input type="text" placeholder="Buscar fornecedor ou descricao..." value={termoBusca} onChange={(e) => setTermoBusca(e.target.value)} className="bg-transparent border-none outline-none text-sm text-slate-700 dark:text-slate-300 w-full font-inter placeholder:text-slate-400" />
            </div>
            <select value={filtroMes} onChange={(e) => setFiltroMes(e.target.value)} className="text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="TODOS">Todos os meses</option>
              {['FEV_26', 'MAR_26', 'ABR_26', 'MAI_26', 'JUN_26', 'JUL_26', 'AGO_26', 'SET_26', 'OUT_26', 'NOV_26', 'DEZ_26'].map(mes => (
                <option key={mes} value={mes}>{formatMes(mes)}</option>
              ))}
            </select>
            <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)} className="text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="TODOS">Todos os status</option>
              <option value="PENDENTE">Pendente</option>
              <option value="RECEBIDO">Recebido</option>
              <option value="APROVADO">Aprovado</option>
              <option value="PAGO">Pago</option>
            </select>
            <select value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value)} className="text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="TODOS">Todas as categorias</option>
              {Object.keys(CATEGORIAS).map(cat => (
                <option key={cat} value={cat}>{formatCategoria(cat)}</option>
              ))}
            </select>
            {(filtroMes !== 'TODOS' || filtroStatus !== 'TODOS' || filtroCategoria !== 'TODOS' || termoBusca) && (
              <button onClick={() => { setFiltroMes('TODOS'); setFiltroStatus('TODOS'); setFiltroCategoria('TODOS'); setTermoBusca(''); }} className="text-sm text-red-500 hover:text-red-700 font-medium flex items-center gap-1 transition-colors">
                <X size={14} /> Limpar
              </button>
            )}
          </div>

          {/* Bottom Section - Investments Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
            {/* Sub-tabs */}
            <div className="flex border-b border-slate-100 dark:border-slate-800 px-4">
              <button onClick={() => setSubTab('investimentos')} className={`text-sm font-medium px-4 py-3 border-b-2 transition-colors ${subTab === 'investimentos' ? 'border-blue-600 text-blue-700 dark:text-blue-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}>
                Investimentos ({investimentosFiltrados.length})
              </button>
              <button onClick={() => setSubTab('funcionarios')} className={`text-sm font-medium px-4 py-3 border-b-2 transition-colors ${subTab === 'funcionarios' ? 'border-blue-600 text-blue-700 dark:text-blue-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}>
                Funcionarios ({funcionarios.length})
              </button>
              <button onClick={() => setSubTab('passagens')} className={`text-sm font-medium px-4 py-3 border-b-2 transition-colors ${subTab === 'passagens' ? 'border-blue-600 text-blue-700 dark:text-blue-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}>
                Passagens ({passagens.length})
              </button>
            </div>

            {/* Tab: Investimentos */}
            {subTab === 'investimentos' && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/50">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-inter">Fornecedor</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-inter">Categoria</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-inter">Vencimento</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-inter">Valor</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-inter">Status</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-inter">Responsavel</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-inter">Acoes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                    {investimentosFiltrados.map((investimento) => {
                      const fornecedor = fornecedores.find(f => f.nome === investimento.nome_fornecedor)
                      return (
                        <tr key={investimento.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                          <td className="px-4 py-3">
                            <div className="font-semibold text-slate-900 dark:text-white">{investimento.nome_fornecedor}</div>
                            <div className="text-xs text-slate-400 mt-0.5">
                              {fornecedor?.email && <span>{fornecedor.email}</span>}
                              {fornecedor?.email && fornecedor?.telefone && <span> - </span>}
                              {fornecedor?.telefone && <span>{fornecedor.telefone}</span>}
                              {!fornecedor?.email && !fornecedor?.telefone && <span className="opacity-0">-</span>}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: `${CATEGORIAS[investimento.tipo_fornecedor]}18`, color: CATEGORIAS[investimento.tipo_fornecedor] }}>
                              {formatCategoria(investimento.tipo_fornecedor)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-400 font-inter">{format(new Date(investimento.data_vencimento), 'dd/MM/yyyy', { locale: ptBR })}</td>
                          <td className="px-4 py-3">
                            <span className="font-semibold text-slate-900 dark:text-white">R$ {Number(investimento.valor_realizado).toLocaleString('pt-BR')}</span>
                            <span className="block text-xs text-slate-400">Orcado: R$ {Number(investimento.valor_orcado).toLocaleString('pt-BR')}</span>
                          </td>
                          <td className="px-4 py-3">
                            {editandoId === investimento.id ? (
                              <select value={investimento.status} onChange={(e) => handleStatusChange(investimento.id, e.target.value)} onBlur={() => setEditandoId(null)} autoFocus className="text-xs border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500">
                                <option value="PENDENTE">Pendente</option>
                                <option value="RECEBIDO">Recebido</option>
                                <option value="APROVADO">Aprovado</option>
                                <option value="PAGO">Pago</option>
                              </select>
                            ) : (
                              <span onClick={() => setEditandoId(investimento.id)} className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold cursor-pointer ${investimento.status === 'PAGO' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : investimento.status === 'APROVADO' ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400' : investimento.status === 'RECEBIDO' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'}`}>
                                {investimento.status}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {investimento.responsavel_avatar ? (
                                <img src={investimento.responsavel_avatar} alt={investimento.responsavel} className="w-6 h-6 rounded-full object-cover" />
                              ) : (
                                <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-xs font-bold text-blue-600 dark:text-blue-400 flex-shrink-0">{getInitials(investimento.responsavel)}</div>
                              )}
                              <span className="text-xs text-slate-700 dark:text-slate-300 whitespace-nowrap">{investimento.responsavel}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <button onClick={() => handleEdit(investimento)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-all" title="Editar">
                                <Edit2 size={14} />
                              </button>
                              <button onClick={() => handleDeleteInvestimento(investimento.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-all" title="Excluir">
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                    {investimentosFiltrados.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-4 py-16 text-center">
                          <div className="flex flex-col items-center gap-3 text-slate-400">
                            <span className="material-symbols-outlined text-5xl">search_off</span>
                            <p className="text-sm font-inter">Nenhum investimento encontrado</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Tab: Funcionarios */}
            {subTab === 'funcionarios' && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/50">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-inter">Nome</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-inter">CPF</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-inter">Email</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-inter">Telefone</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-inter">Acoes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                    {funcionarios.map(func => (
                      <tr key={func.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">{func.nome}</td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400 font-inter">{func.cpf || '-'}</td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400 font-inter">{func.email || '-'}</td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400 font-inter">{func.telefone || '-'}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button onClick={() => setFuncionarioEditando(func)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-all" title="Editar"><Edit2 size={14} /></button>
                            <button onClick={() => handleDeleteFuncionario(func.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-all" title="Excluir"><Trash2 size={14} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {funcionarios.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-16 text-center">
                          <div className="flex flex-col items-center gap-3 text-slate-400">
                            <span className="material-symbols-outlined text-5xl">search_off</span>
                            <p className="text-sm font-inter">Nenhum funcionario encontrado</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Tab: Passagens */}
            {subTab === 'passagens' && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/50">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-inter">Passageiro</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-inter">Tipo</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-inter">Ida</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-inter">Volta</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-inter">Valor</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-inter">Acoes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                    {passagens.map(pass => (
                      <tr key={pass.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">{pass.nome_passageiro}</td>
                        <td className="px-4 py-3"><span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${pass.tipo === 'aereo' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'}`}>{pass.tipo}</span></td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400 font-inter">{safeFormatDate(pass.data_ida)}{pass.hora_ida && <> - {pass.hora_ida}</>}</td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400 font-inter">{safeFormatDate(pass.data_volta)}{pass.hora_volta && <> - {pass.hora_volta}</>}</td>
                        <td className="px-4 py-3 font-semibold text-emerald-600 dark:text-emerald-400">R$ {Number(pass.valor || 0).toLocaleString('pt-BR')}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button onClick={() => setPassagemEditando(pass)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-all" title="Editar"><Edit2 size={14} /></button>
                            <button onClick={() => handleDeletePassagem(pass.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-all" title="Excluir"><Trash2 size={14} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {passagens.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-16 text-center">
                          <div className="flex flex-col items-center gap-3 text-slate-400">
                            <span className="material-symbols-outlined text-5xl">search_off</span>
                            <p className="text-sm font-inter">Nenhuma passagem encontrada</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Floating Action Button */}
        <button onClick={() => setShowForm(true)} className="fixed bottom-6 right-6 lg:bottom-8 lg:right-8 w-14 h-14 primary-gradient text-white rounded-full shadow-2xl shadow-blue-900/30 flex items-center justify-center z-40 hover:shadow-3xl hover:scale-105 transition-all" title="Novo investimento">
          <span className="material-symbols-outlined text-2xl">add</span>
        </button>

        <BottomNavBar />
      </main>

      {/* InvestmentForm modal */}
      {showForm && (
        <InvestmentForm session={session} onClose={handleCloseForm} investimento={investimentoEditando} />
      )}

      {/* Modal de Edicao de Funcionario */}
      {funcionarioEditando && (
        <div className="modal-overlay" onClick={() => setFuncionarioEditando(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{maxWidth: '500px'}}>
            <div className="modal-header">
              <h3>Editar Funcionario</h3>
              <button onClick={() => setFuncionarioEditando(null)} className="btn-close"><X size={20} /></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Nome</label>
                <input type="text" value={funcionarioEditando.nome} onChange={e => setFuncionarioEditando({...funcionarioEditando, nome: e.target.value})} />
              </div>
              <div className="form-group">
                <label>CPF</label>
                <input type="text" value={funcionarioEditando.cpf || ''} onChange={e => setFuncionarioEditando({...funcionarioEditando, cpf: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input type="email" value={funcionarioEditando.email || ''} onChange={e => setFuncionarioEditando({...funcionarioEditando, email: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Telefone</label>
                <input type="text" value={funcionarioEditando.telefone || ''} onChange={e => setFuncionarioEditando({...funcionarioEditando, telefone: e.target.value})} />
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setFuncionarioEditando(null)} className="btn btn-secondary">Cancelar</button>
              <button onClick={handleSaveFuncionario} className="btn btn-primary">Salvar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edicao de Passagem */}
      {passagemEditando && (
        <div className="modal-overlay" onClick={() => setPassagemEditando(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{maxWidth: '600px'}}>
            <div className="modal-header">
              <h3>Editar Passagem</h3>
              <button onClick={() => setPassagemEditando(null)} className="btn-close"><X size={20} /></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Passageiro</label>
                <input type="text" value={passagemEditando.nome_passageiro} onChange={e => setPassagemEditando({...passagemEditando, nome_passageiro: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Tipo</label>
                <select value={passagemEditando.tipo} onChange={e => setPassagemEditando({...passagemEditando, tipo: e.target.value})}>
                  <option value="aereo">Aereo</option>
                  <option value="onibus">Onibus</option>
                </select>
              </div>
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px'}}>
                <div className="form-group">
                  <label>Data Ida</label>
                  <input type="date" value={passagemEditando.data_ida?.split('T')[0] || ''} onChange={e => setPassagemEditando({...passagemEditando, data_ida: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Hora Ida</label>
                  <input type="text" value={passagemEditando.hora_ida || ''} onChange={e => setPassagemEditando({...passagemEditando, hora_ida: e.target.value})} placeholder="18:05" />
                </div>
                <div className="form-group">
                  <label>Data Volta</label>
                  <input type="date" value={passagemEditando.data_volta?.split('T')[0] || ''} onChange={e => setPassagemEditando({...passagemEditando, data_volta: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Hora Volta</label>
                  <input type="text" value={passagemEditando.hora_volta || ''} onChange={e => setPassagemEditando({...passagemEditando, hora_volta: e.target.value})} placeholder="06:10" />
                </div>
              </div>
              <div className="form-group">
                <label>Valor</label>
                <input type="number" value={passagemEditando.valor || ''} onChange={e => setPassagemEditando({...passagemEditando, valor: parseFloat(e.target.value)})} step="0.01" />
              </div>
              <div className="form-group">
                <label>Evento</label>
                <input type="text" value={passagemEditando.evento || ''} onChange={e => setPassagemEditando({...passagemEditando, evento: e.target.value})} placeholder="Imersao Galaxy Mar_26" />
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setPassagemEditando(null)} className="btn btn-secondary">Cancelar</button>
              <button onClick={handleSavePassagem} className="btn btn-primary">Salvar</button>
            </div>
          </div>
        </div>
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
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-800">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-slate-500 dark:text-slate-400 font-headline">{title}</span>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{background: `${color}15`, color}}>
          <Icon size={18} />
        </div>
      </div>
      <div className="text-2xl font-bold text-slate-900 dark:text-white font-headline mb-1">R$ {value.toLocaleString('pt-BR')}</div>
      <div className="text-xs font-semibold font-inter" style={{color}}>{indicator}</div>
    </div>
  )
}
