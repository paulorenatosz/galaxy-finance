import { useState, useEffect } from 'react'
import { Session } from '@supabase/supabase-js'
import { supabase } from '../App'
import TopNavBar from './layout/TopNavBar'
import { Check, Save, Search, Upload, FileText, FolderOpen, ExternalLink, AlertCircle, CheckCircle2 } from 'lucide-react'

interface Fornecedor {
  id: string
  nome: string
  email: string | null
  telefone: string | null
  categoria: string | null
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
  datas_pagamento: string[]  // Array de datas para parcelas
  numero_nota_fiscal: string
  possui_boleto_nf: boolean
  categoria_detalhe: string
  subcategoria: string
  responsavel: string
  responsavel_avatar: string
  mes_referencia: string
  observacoes: string
  status: 'PENDENTE' | 'RECEBIDO' | 'APROVADO' | 'PAGO'
}

interface Evento {
  id: string
  nome: string
  tipo: string
  subevento: string
}

interface InvestmentFormProps {
  session: Session
  onClose: () => void
  investimento?: Investimento | null
}

// Opções de fornecedores - formato de exibição (Title Case)
const TIPOS_FORNECEDOR = [
  { value: 'ESPAÇO E INFRAESTRUTURA', label: 'Espaço e Infraestrutura' },
  { value: 'CATERING E BEBIDAS', label: 'Catering e Bebidas' },
  { value: 'DESLOCAMENTO E HOSPEDAGEM', label: 'Deslocamento e Hospedagem' },
  { value: 'PRESTAÇÃO DE SERVIÇOS', label: 'Prestação de Serviços' },
  { value: 'MATERIAIS E BRINDES', label: 'Materiais e Brindes' },
  { value: 'DECORAÇÃO E AMBIENTE', label: 'Decoração e Ambiente' },
]

const FORMAS_PAGAMENTO = [
  { value: 'PIX', label: 'PIX' },
  { value: 'Boleto', label: 'Boleto' },
  { value: 'Transferência Bancária', label: 'Transferência Bancária' },
  { value: 'Cartão (Crédito/Débito)', label: 'Cartão (Crédito/Débito)' },
  { value: 'Dinheiro', label: 'Dinheiro' },
]

const MESES = [
  { value: 'FEV_26', label: 'Fevereiro/2026' },
  { value: 'MAR_26', label: 'Março/2026' },
  { value: 'ABR_26', label: 'Abril/2026' },
  { value: 'MAI_26', label: 'Maio/2026' },
  { value: 'JUN_26', label: 'Junho/2026' },
  { value: 'JUL_26', label: 'Julho/2026' },
  { value: 'AGO_26', label: 'Agosto/2026' },
  { value: 'SET_26', label: 'Setembro/2026' },
  { value: 'OUT_26', label: 'Outubro/2026' },
  { value: 'NOV_26', label: 'Novembro/2026' },
  { value: 'DEZ_26', label: 'Dezembro/2026' },
]

const RESPONSAVEIS_PADRAO = ['Paulo Renato', 'Robson Conceição', 'Cintia']

const SUBCATEGORIAS: Record<string, string[]> = {
  'ESPAÇO E INFRAESTRUTURA': ['Espaço', 'Móveis', 'Equipamentos'],
  'CATERING E BEBIDAS': ['Buffet', 'Consignado Bebidas', 'Café/Lanches', 'Suprimentos'],
  'DESLOCAMENTO E HOSPEDAGEM': ['Companhia Aérea', 'Hotel', 'Uber/Transporte App', 'Translado'],
  'PRESTAÇÃO DE SERVIÇOS': ['Fotógrafo', 'Locutor', 'Pessoal Temporário', 'Transporte'],
  'MATERIAIS E BRINDES': ['Garrafas Personalizadas', 'Mochilas', 'Moleskine/Cadernos', 'Crachás/Cordões', 'Coletes'],
  'DECORAÇÃO E AMBIENTE': ['Decoração Floral', 'Cenografia', 'Luminoso', 'Sinalização'],
}

// Função para formatar número como moeda brasileira
const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value)
}

// Função para converter string de moeda para número
const parseCurrency = (value: string): number => {
  if (!value) return 0
  const cleaned = value.replace(/\./g, '').replace(',', '.')
  return parseFloat(cleaned) || 0
}

// Converte número para formato brasileiro R$ 1.234,00
const formatBRL = (val: string): string => {
  if (!val) return ''
  // Separa parte inteira e decimal pela vírgula
  const parts = val.split(',')
  const intPart = parts[0].replace(/[^\d]/g, '')
  const decPart = parts[1] || ''

  if (!intPart) return ''

  // Formata parte inteira com pontos como separador de milhar
  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.')

  // Adiciona a parte decimal com vírgula se existir
  if (decPart !== '') {
    return `${formattedInt},${decPart.substring(0, 2).padEnd(2, '0')}`
  }

  return formattedInt
}

// Componente de Input de Moeda - formato brasileiro R$ 1.900,00
function CurrencyInput({ name, value, onChange, required, placeholder }: {
  name: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  required?: boolean
  placeholder?: string
}) {
  // Estado para o valor exibido (formatado)
  const [displayValue, setDisplayValue] = useState('')

  // Sincroniza o valor externo com o estado de exibição
  useEffect(() => {
    if (value) {
      // Converte para formato brasileiro
      setDisplayValue(formatBRL(value))
    } else {
      setDisplayValue('')
    }
  }, [value])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Permite apenas dígitos e vírgula
    let input = e.target.value.replace(/[^\d,]/g, '')
    // Atualiza o estado para exibição formatada
    setDisplayValue(formatBRL(input))
    // Passa o valor raw para o form (sem formatação)
    onChange({
      target: { name, value: input }
    } as any)
  }

  const handleBlur = () => {
    // Garante formato correto ao perder foco
    if (value) {
      setDisplayValue(formatBRL(value))
    }
  }

  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">R$</span>
      <input
        type="text"
        name={name}
        value={displayValue}
        onChange={handleChange}
        onBlur={handleBlur}
        required={required}
        placeholder={placeholder || "0,00"}
        className="w-full pl-8 pr-3 py-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
        inputMode="decimal"
      />
    </div>
  )
}

export default function InvestmentForm({ session, onClose, investimento }: InvestmentFormProps) {
  const [eventos, setEventos] = useState<Evento[]>([])
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([])
  const [fornecedorBusca, setFornecedorBusca] = useState('')
  const [fornecedoresFiltrados, setFornecedoresFiltrados] = useState<Fornecedor[]>([])
  const [showFornecedorDropdown, setShowFornecedorDropdown] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [users, setUsers] = useState<any[]>([])
  const isEditing = !!investimento
  const [parcelas, setParcelas] = useState<string[]>([])

  // Upload to Drive states
  const [uploadingNF, setUploadingNF] = useState(false)
  const [uploadingORC, setUploadingORC] = useState(false)
  const [uploadResultNF, setUploadResultNF] = useState<{ status: string; fileName?: string; webViewLink?: string; caminho?: string; error?: string } | null>(null)
  const [uploadResultORC, setUploadResultORC] = useState<{ status: string; fileName?: string; webViewLink?: string; caminho?: string; error?: string } | null>(null)
  const [driveConnected, setDriveConnected] = useState<boolean | null>(null)
  const [eventoPastas, setEventoPastas] = useState<{ id: string; name: string }[]>([])
  const [eventoPastaSelecionada, setEventoPastaSelecionada] = useState('')
  const [buscandoPasta, setBuscandoPasta] = useState(false)

  const userName = session.user.user_metadata?.name || session.user.email || ''
  const responsaveisDinamicos = Array.from(new Set([...RESPONSAVEIS_PADRAO, userName])).filter(r => r && r.trim() !== '')

  // Adicionar parcela
  const addParcela = () => {
    const novaData = ''
    setParcelas([...parcelas, novaData])
  }

  // Remover parcela
  const removeParcela = (index: number) => {
    const novas = parcelas.filter((_, i) => i !== index)
    setParcelas(novas)
    // Atualiza o formData
    const datasStr = novas.join(',')
    setFormData(prev => ({ ...prev, datas_pagamento: datasStr }))
  }

  // Atualizar data de uma parcela
  const updateParcela = (index: number, value: string) => {
    const novas = [...parcelas]
    novas[index] = value
    setParcelas(novas)
    // Atualiza o formData
    const datasStr = novas.join(',')
    setFormData(prev => ({ ...prev, datas_pagamento: datasStr }))
  }

  // Buscar eventos e fornecedores ao carregar o formulário
  useEffect(() => {
    const fetchData = async () => {
      const { data: eventosData } = await supabase
        .from('eventos')
        .select('*')
        .eq('status', 'ativo')
        .order('nome')
      if (eventosData) setEventos(eventosData)

      const { data: fornecedoresData } = await supabase
        .from('fornecedores')
        .select('*')
        .eq('status', 'ativo')
        .order('nome')
      if (fornecedoresData) {
        setFornecedores(fornecedoresData)
        setFornecedoresFiltrados(fornecedoresData)
      }

      const { data: profilesData } = await supabase
        .from('perfiles')
        .select('nome, avatar_url')
      if (profilesData) setUsers(profilesData)

      // Verificar conexão com Drive
      try {
        const driveRes = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/drive/status`)
        const driveData = await driveRes.json()
        setDriveConnected(driveData.connected)
      } catch { setDriveConnected(false) }
    }
    fetchData()
  }, [])

  const [formData, setFormData] = useState({
    evento_id: '',
    tipo_fornecedor: '',
    nome_fornecedor: '',
    descricao_despesa: '',
    valor_orcado: '',
    valor_realizado: '',
    quantidade: '1',
    forma_pagamento: '',
    numero_parcelas: '1',
    data_vencimento: '',
    datas_pagamento: '',
    numero_nota_fiscal: '',
    possui_boleto_nf: 'false',
    categoria_detalhe: '',
    subcategoria: '',
    responsavel: session.user.user_metadata?.name || '',
    mes_referencia: '',
    observacoes: '',
    status: 'PENDENTE',
  })

  // Preencher dados quando em modo de edição
  useEffect(() => {
    if (investimento) {
      // Inicializar parcelas
      if (investimento.datas_pagamento && investimento.datas_pagamento.length > 0) {
        setParcelas(investimento.datas_pagamento)
      }
      setFormData({
        evento_id: investimento.evento_id || '',
        tipo_fornecedor: investimento.tipo_fornecedor || '',
        nome_fornecedor: investimento.nome_fornecedor || '',
        descricao_despesa: investimento.descricao_despesa || '',
        valor_orcado: investimento.valor_orcado?.toString() || '',
        valor_realizado: investimento.valor_realizado?.toString() || '',
        quantidade: investimento.quantidade?.toString() || '1',
        forma_pagamento: investimento.forma_pagamento || '',
        numero_parcelas: investimento.numero_parcelas?.toString() || '1',
        data_vencimento: investimento.data_vencimento ? investimento.data_vencimento.split('T')[0] : '',
        datas_pagamento: investimento.datas_pagamento ? investimento.datas_pagamento.join(',') : '',
        numero_nota_fiscal: investimento.numero_nota_fiscal || '',
        possui_boleto_nf: investimento.possui_boleto_nf ? 'true' : 'false',
        categoria_detalhe: investimento.categoria_detalhe || '',
        subcategoria: investimento.subcategoria || '',
        responsavel: investimento.responsavel || '',
        mes_referencia: investimento.mes_referencia || '',
        observacoes: investimento.observacoes || '',
        status: investimento.status || 'PENDENTE',
      })
    }
  }, [investimento])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))

    // Filtrar fornecedores quando digitar
    if (name === 'nome_fornecedor') {
      setFornecedorBusca(value)
      if (value.length > 0) {
        const filtrados = fornecedores.filter(f =>
          f.nome.toLowerCase().includes(value.toLowerCase()) ||
          f.categoria?.toLowerCase().includes(value.toLowerCase())
        )
        setFornecedoresFiltrados(filtrados)
        setShowFornecedorDropdown(true)
      } else {
        setFornecedoresFiltrados(fornecedores)
        setShowFornecedorDropdown(false)
      }
    }
  }

  const handleSelectFornecedor = (fornecedor: Fornecedor) => {
    setFormData(prev => ({
      ...prev,
      nome_fornecedor: fornecedor.nome,
      tipo_fornecedor: fornecedor.categoria || prev.tipo_fornecedor
    }))
    setShowFornecedorDropdown(false)
    setFornecedorBusca('')
  }

  // Buscar pasta do evento no Drive pelo nome
  const buscarPastaEvento = async () => {
    const eventoSelecionado = eventos.find(e => e.id === formData.evento_id)
    if (!eventoSelecionado) return

    setBuscandoPasta(true)
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/drive/buscar-pasta-evento`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome_evento: eventoSelecionado.nome })
      })
      const data = await res.json()
      if (data.encontrada) {
        setEventoPastaSelecionada(data.pasta.id)
        setEventoPastas([data.pasta])
      } else {
        setEventoPastas(data.sugestoes || [])
        setEventoPastaSelecionada('')
      }
    } catch (err) {
      console.error('Erro ao buscar pasta:', err)
    } finally {
      setBuscandoPasta(false)
    }
  }

  // Listar todas as pastas de evento disponíveis
  const listarPastasEvento = async () => {
    setBuscandoPasta(true)
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/drive/listar-pastas-evento`)
      const data = await res.json()
      setEventoPastas(data.pastas || [])
    } catch (err) {
      console.error('Erro ao listar pastas:', err)
    } finally {
      setBuscandoPasta(false)
    }
  }

  // Upload de arquivo para o Drive
  const handleFileUpload = async (tipoDocumento: 'NF' | 'ORCAMENTO', file: File) => {
    if (!eventoPastaSelecionada) {
      alert('Selecione a pasta do evento no Drive primeiro')
      return
    }

    const setUploading = tipoDocumento === 'NF' ? setUploadingNF : setUploadingORC
    const setResult = tipoDocumento === 'NF' ? setUploadResultNF : setUploadResultORC

    setUploading(true)
    setResult(null)

    try {
      // Ler arquivo como base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
          const result = reader.result as string
          resolve(result.split(',')[1]) // Remove prefix data:...
        }
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/drive/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file: base64,
          file_name: file.name,
          tipo_documento: tipoDocumento,
          evento_pasta_id: eventoPastaSelecionada,
          nome_fornecedor: formData.nome_fornecedor,
          data_vencimento: formData.data_vencimento,
          numero_nota_fiscal: formData.numero_nota_fiscal,
          valor: formData.valor_realizado || formData.valor_orcado
        })
      })

      const data = await res.json()
      if (res.ok) {
        setResult({ status: 'ok', fileName: data.fileName, webViewLink: data.webViewLink, caminho: data.caminho })
        if (tipoDocumento === 'NF') {
          setFormData(prev => ({ ...prev, possui_boleto_nf: 'true' }))
        }
      } else {
        setResult({ status: 'error', error: data.error || 'Erro no upload' })
      }
    } catch (err: any) {
      setResult({ status: 'error', error: err.message || 'Erro de conexão' })
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const investimentoData = {
        evento_id: formData.evento_id || null,
        tipo_fornecedor: formData.tipo_fornecedor,
        nome_fornecedor: formData.nome_fornecedor,
        descricao_despesa: formData.descricao_despesa,
        valor_orcado: parseCurrency(formData.valor_orcado.toString()),
        valor_realizado: parseCurrency(formData.valor_realizado.toString()),
        quantidade: parseInt(formData.quantidade) || 1,
        forma_pagamento: formData.forma_pagamento,
        numero_parcelas: parseInt(formData.numero_parcelas) || 1,
        data_vencimento: formData.data_vencimento,
        datas_pagamento: formData.datas_pagamento ? formData.datas_pagamento.split(',').map(d => d.trim()).filter(d => d) : [],
        numero_nota_fiscal: formData.numero_nota_fiscal,
        possui_boleto_nf: formData.possui_boleto_nf === 'true',
        categoria_detalhe: formData.categoria_detalhe,
        subcategoria: formData.subcategoria,
        responsavel: formData.responsavel,
        responsavel_avatar: users.find(u => u.nome === formData.responsavel)?.avatar_url || (formData.responsavel === userName ? (session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture) : ''),
        mes_referencia: formData.mes_referencia,
        observacoes: formData.observacoes,
        status: formData.status,
      }

      let error: any

      if (isEditing && investimento?.id) {
        // Modo edição - update
        ({ error } = await supabase
          .from('investimentos')
          .update(investimentoData)
          .eq('id', investimento.id))
      } else {
        // Modo criação - insert
        ({ error } = await supabase.from('investimentos').insert({
          ...investimentoData,
          user_id: session.user.id,
        }))
      }

      if (error) throw error

      setSuccess(true)
      setTimeout(() => onClose(), 1500)
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar investimento')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 text-center shadow-2xl max-w-sm mx-4 animate-scale-in">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
            {isEditing ? 'Investimento Atualizado!' : 'Investimento Salvo!'}
          </h2>
          <p className="text-gray-500 dark:text-slate-400">Redirecionando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <TopNavBar session={session} currentPage="cadastros" />

      <main className="pt-20 pb-8 px-4 md:px-6 lg:px-8 max-w-6xl mx-auto">
        {/* Breadcrumb Header */}
        <div className="mb-6">
          <nav className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-2">
            <button onClick={onClose} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              <span className="material-symbols-outlined text-lg">arrow_back</span>
            </button>
            <span className="material-symbols-outlined text-sm">chevron_right</span>
            <span>Cadastros</span>
            <span className="material-symbols-outlined text-sm">chevron_right</span>
            <span className="text-gray-800 dark:text-white font-medium">Novo Investimento</span>
          </nav>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white font-headline">
            {isEditing ? 'Editar Investimento' : 'Novo Investimento'}
          </h1>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Card: Evento & Identificação - Asymmetric Grid 1/3 + 2/3 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Evento Section */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-blue-600 dark:text-blue-400">event</span>
                <h3 className="font-semibold text-gray-800 dark:text-white">Evento</h3>
              </div>
              <div className="form-group">
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">Evento *</label>
                <select
                  name="evento_id"
                  value={formData.evento_id}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                >
                  <option value="">Selecione o evento...</option>
                  {eventos.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
                </select>
              </div>
            </div>

            {/* Identificação Section */}
            <div className="md:col-span-2 bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-blue-600 dark:text-blue-400">badge</span>
                <h3 className="font-semibold text-gray-800 dark:text-white">Identificação</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">Tipo de Fornecedor *</label>
                  <select
                    name="tipo_fornecedor"
                    value={formData.tipo_fornecedor}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  >
                    <option value="">Selecione...</option>
                    {TIPOS_FORNECEDOR.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>

                <div className="form-group relative">
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">Fornecedor *</label>
                  <div className="relative">
                    <input
                      type="text"
                      name="nome_fornecedor"
                      value={formData.nome_fornecedor}
                      onChange={handleChange}
                      onFocus={() => setShowFornecedorDropdown(true)}
                      required
                      placeholder="Buscar fornecedor..."
                      autoComplete="off"
                      className="w-full px-3 py-2.5 pr-10 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                    <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  </div>

                  {/* Dropdown de fornecedores */}
                  {showFornecedorDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl shadow-lg max-h-48 overflow-y-auto z-50">
                      {fornecedoresFiltrados.length > 0 ? (
                        fornecedoresFiltrados.map(fornecedor => (
                          <button
                            key={fornecedor.id}
                            type="button"
                            onClick={() => handleSelectFornecedor(fornecedor)}
                            className="w-full px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-600 border-b border-slate-100 dark:border-slate-600 last:border-b-0 transition-colors"
                          >
                            <div className="font-medium text-gray-800 dark:text-white">{fornecedor.nome}</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                              {fornecedor.email && <span>{fornecedor.email}</span>}
                              {fornecedor.email && fornecedor.telefone && <span> • </span>}
                              {fornecedor.telefone && <span>{fornecedor.telefone}</span>}
                            </div>
                          </button>
                        ))
                      ) : (
                        <div className="px-4 py-3 text-center text-slate-500 dark:text-slate-400 text-sm">
                          Nenhum fornecedor encontrado
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Card: Descrição */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-4">
              <span className="material-symbols-outlined text-blue-600 dark:text-blue-400">description</span>
              <h3 className="font-semibold text-gray-800 dark:text-white">Descrição</h3>
            </div>
            <div className="form-group">
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">Descrição da Despesa *</label>
              <textarea
                name="descricao_despesa"
                value={formData.descricao_despesa}
                onChange={handleChange}
                required
                rows={3}
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                placeholder="Descreva os detalhes da despesa..."
              />
            </div>
          </div>

          {/* Card: Informações Financeiras - Grid 4/4/4/8/4 */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-4">
              <span className="material-symbols-outlined text-blue-600 dark:text-blue-400">payments</span>
              <h3 className="font-semibold text-gray-800 dark:text-white">Informações Financeiras</h3>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {/* Valor Orçado - 4 col */}
              <div className="col-span-2 md:col-span-2 form-group">
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">Valor Orçado (R$) *</label>
                <CurrencyInput
                  name="valor_orcado"
                  value={formData.valor_orcado.toString()}
                  onChange={handleChange}
                  required
                  placeholder="0,00"
                />
              </div>

              {/* Valor Realizado - 4 col */}
              <div className="col-span-2 md:col-span-2 form-group">
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">Valor Realizado (R$) *</label>
                <CurrencyInput
                  name="valor_realizado"
                  value={formData.valor_realizado.toString()}
                  onChange={handleChange}
                  required
                  placeholder="0,00"
                />
              </div>

              {/* Quantidade - 4 col */}
              <div className="col-span-1 form-group">
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">Qtd</label>
                <input
                  type="number"
                  name="quantidade"
                  value={formData.quantidade}
                  onChange={handleChange}
                  min="1"
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>

              {/* Forma de Pagamento - 8 col (input chips) */}
              <div className="col-span-2 md:col-span-4 form-group">
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">Forma de Pagamento *</label>
                <div className="flex flex-wrap gap-2">
                  {FORMAS_PAGAMENTO.map(forma => (
                    <button
                      key={forma.value}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, forma_pagamento: forma.value }))}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                        formData.forma_pagamento === forma.value
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                      }`}
                    >
                      {forma.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Parcelas - 4 col */}
              <div className="col-span-1 form-group">
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">Parcelas</label>
                <input
                  type="number"
                  name="numero_parcelas"
                  value={formData.numero_parcelas}
                  onChange={handleChange}
                  min="1"
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
            </div>
          </div>

          {/* Card: Prazos e Documentos - 2 columns */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-blue-600 dark:text-blue-400">schedule</span>
                <h3 className="font-semibold text-gray-800 dark:text-white">Prazos</h3>
              </div>

              <div className="space-y-4">
                <div className="form-group">
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">Data de Vencimento *</label>
                  <input
                    type="date"
                    name="data_vencimento"
                    value={formData.data_vencimento}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>

                {/* Parcelas */}
                <div className="form-group">
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">Datas de Parcelas</label>
                  <div className="space-y-2">
                    {parcelas.map((data, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <span className="text-xs text-slate-500 dark:text-slate-400 w-16">{index + 1}ª parcela</span>
                        <input
                          type="date"
                          value={data}
                          onChange={(e) => updateParcela(index, e.target.value)}
                          className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-gray-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <button
                          type="button"
                          onClick={() => removeParcela(index)}
                          className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        >
                          <span className="material-symbols-outlined text-lg">close</span>
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={addParcela}
                      className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                    >
                      <span className="material-symbols-outlined text-lg">add</span>
                      Adicionar Parcela
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-blue-600 dark:text-blue-400">receipt_long</span>
                <h3 className="font-semibold text-gray-800 dark:text-white">Documentos</h3>
              </div>

              <div className="space-y-4">
                <div className="form-group">
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">Número da Nota Fiscal</label>
                  <input
                    type="text"
                    name="numero_nota_fiscal"
                    value={formData.numero_nota_fiscal}
                    onChange={handleChange}
                    placeholder="NF-2026-001"
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>

                <div className="form-group">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      name="possui_boleto_nf"
                      checked={formData.possui_boleto_nf === 'true'}
                      onChange={(e) => setFormData(prev => ({ ...prev, possui_boleto_nf: e.target.checked ? 'true' : 'false' }))}
                      className="w-5 h-5 rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-slate-600 dark:text-slate-300">Possui boleto/NF anexado</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Card: Upload para Google Drive - FULL WIDTH */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-600 dark:text-blue-400">cloud_upload</span>
                <h3 className="font-semibold text-gray-800 dark:text-white">Upload para Google Drive</h3>
              </div>
              {driveConnected === true && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-xs font-medium rounded-full">
                  <CheckCircle2 size={12} /> Conectado
                </span>
              )}
              {driveConnected === false && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-50 dark:bg-red-900/30 text-red-500 dark:text-red-400 text-xs font-medium rounded-full">
                  <AlertCircle size={12} /> Desconectado
                </span>
              )}
            </div>

            {driveConnected === false ? (
              <div className="text-center py-6 bg-slate-50 dark:bg-slate-700/30 rounded-xl">
                <FolderOpen size={40} className="text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">Conecte o Google Drive na página de Integrações para enviar arquivos.</p>
                <a href="/integracoes" className="text-sm text-blue-600 dark:text-blue-400 font-medium hover:underline">Ir para Integrações →</a>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Seleção de pasta do evento */}
                <div className="form-group">
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">Pasta do Evento no Drive</label>
                  <div className="flex gap-2">
                    <select
                      value={eventoPastaSelecionada}
                      onChange={(e) => setEventoPastaSelecionada(e.target.value)}
                      className="flex-1 px-3 py-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
                    >
                      <option value="">Selecione a pasta do evento...</option>
                      {eventoPastas.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={buscarPastaEvento}
                      disabled={!formData.evento_id || buscandoPasta}
                      className="px-3 py-2.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      title="Buscar automaticamente"
                    >
                      <Search size={18} />
                    </button>
                    <button
                      type="button"
                      onClick={listarPastasEvento}
                      disabled={buscandoPasta}
                      className="px-3 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors disabled:opacity-40"
                      title="Listar todas as pastas"
                    >
                      <FolderOpen size={18} />
                    </button>
                  </div>
                  {buscandoPasta && (
                    <p className="text-xs text-blue-500 mt-1 animate-pulse">Buscando pastas no Drive...</p>
                  )}
                  <p className="text-xs text-slate-400 mt-1">🔍 Use a lupa para buscar pelo nome do evento, ou a pasta para listar todas.</p>
                </div>

                {/* Upload NF e Orçamento - Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Upload NF */}
                  <div className={`p-4 rounded-xl border-2 border-dashed transition-all ${
                    uploadResultNF?.status === 'ok' ? 'border-emerald-300 bg-emerald-50/50 dark:bg-emerald-900/10' :
                    uploadingNF ? 'border-blue-300 bg-blue-50/50 dark:bg-blue-900/10' :
                    'border-slate-200 dark:border-slate-600 hover:border-blue-300 dark:hover:border-blue-500'
                  }`}>
                    <div className="flex items-center gap-2 mb-3">
                      <FileText size={18} className="text-red-500" />
                      <span className="text-sm font-semibold text-gray-800 dark:text-white">Nota Fiscal</span>
                    </div>

                    {uploadResultNF?.status === 'ok' ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 size={16} />
                          <span className="text-xs font-medium">Enviado com sucesso!</span>
                        </div>
                        <p className="text-[10px] text-slate-500 truncate" title={uploadResultNF.caminho}>{uploadResultNF.caminho}</p>
                        <a href={uploadResultNF.webViewLink} target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline">
                          <ExternalLink size={12} /> Ver arquivo
                        </a>
                      </div>
                    ) : uploadResultNF?.status === 'error' ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-red-500">
                          <AlertCircle size={16} />
                          <span className="text-xs font-medium">Erro: {uploadResultNF.error}</span>
                        </div>
                        <label className="block">
                          <input type="file" className="hidden" accept=".pdf,.png,.jpg,.jpeg" onChange={(e) => { if (e.target.files?.[0]) handleFileUpload('NF', e.target.files[0]) }} />
                          <span className="text-xs text-blue-600 dark:text-blue-400 cursor-pointer hover:underline">Tentar novamente</span>
                        </label>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center gap-2 cursor-pointer py-2">
                        <input type="file" className="hidden" accept=".pdf,.png,.jpg,.jpeg,.doc,.docx" disabled={uploadingNF || !eventoPastaSelecionada}
                          onChange={(e) => { if (e.target.files?.[0]) handleFileUpload('NF', e.target.files[0]) }} />
                        {uploadingNF ? (
                          <div className="flex items-center gap-2 text-blue-500">
                            <span className="material-symbols-outlined animate-spin text-lg">sync</span>
                            <span className="text-xs">Enviando...</span>
                          </div>
                        ) : (
                          <>
                            <Upload size={24} className={`${eventoPastaSelecionada ? 'text-slate-400 dark:text-slate-500' : 'text-slate-200 dark:text-slate-700'}`} />
                            <span className={`text-xs ${eventoPastaSelecionada ? 'text-slate-500 dark:text-slate-400' : 'text-slate-300 dark:text-slate-600'}`}>
                              {eventoPastaSelecionada ? 'Clique para enviar NF' : 'Selecione a pasta primeiro'}
                            </span>
                          </>
                        )}
                      </label>
                    )}
                  </div>

                  {/* Upload Orçamento */}
                  <div className={`p-4 rounded-xl border-2 border-dashed transition-all ${
                    uploadResultORC?.status === 'ok' ? 'border-emerald-300 bg-emerald-50/50 dark:bg-emerald-900/10' :
                    uploadingORC ? 'border-blue-300 bg-blue-50/50 dark:bg-blue-900/10' :
                    'border-slate-200 dark:border-slate-600 hover:border-blue-300 dark:hover:border-blue-500'
                  }`}>
                    <div className="flex items-center gap-2 mb-3">
                      <FileText size={18} className="text-amber-500" />
                      <span className="text-sm font-semibold text-gray-800 dark:text-white">Orçamento</span>
                    </div>

                    {uploadResultORC?.status === 'ok' ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 size={16} />
                          <span className="text-xs font-medium">Enviado com sucesso!</span>
                        </div>
                        <p className="text-[10px] text-slate-500 truncate" title={uploadResultORC.caminho}>{uploadResultORC.caminho}</p>
                        <a href={uploadResultORC.webViewLink} target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline">
                          <ExternalLink size={12} /> Ver arquivo
                        </a>
                      </div>
                    ) : uploadResultORC?.status === 'error' ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-red-500">
                          <AlertCircle size={16} />
                          <span className="text-xs font-medium">Erro: {uploadResultORC.error}</span>
                        </div>
                        <label className="block">
                          <input type="file" className="hidden" accept=".pdf,.png,.jpg,.jpeg" onChange={(e) => { if (e.target.files?.[0]) handleFileUpload('ORCAMENTO', e.target.files[0]) }} />
                          <span className="text-xs text-blue-600 dark:text-blue-400 cursor-pointer hover:underline">Tentar novamente</span>
                        </label>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center gap-2 cursor-pointer py-2">
                        <input type="file" className="hidden" accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx" disabled={uploadingORC || !eventoPastaSelecionada}
                          onChange={(e) => { if (e.target.files?.[0]) handleFileUpload('ORCAMENTO', e.target.files[0]) }} />
                        {uploadingORC ? (
                          <div className="flex items-center gap-2 text-blue-500">
                            <span className="material-symbols-outlined animate-spin text-lg">sync</span>
                            <span className="text-xs">Enviando...</span>
                          </div>
                        ) : (
                          <>
                            <Upload size={24} className={`${eventoPastaSelecionada ? 'text-slate-400 dark:text-slate-500' : 'text-slate-200 dark:text-slate-700'}`} />
                            <span className={`text-xs ${eventoPastaSelecionada ? 'text-slate-500 dark:text-slate-400' : 'text-slate-300 dark:text-slate-600'}`}>
                              {eventoPastaSelecionada ? 'Clique para enviar Orçamento' : 'Selecione a pasta primeiro'}
                            </span>
                          </>
                        )}
                      </label>
                    )}
                  </div>
                </div>

                <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-relaxed">
                  📄 Nomenclatura automática: <strong>NF_FORNECEDOR_DD_MM_AAAA_NumeroNF.ext</strong> ou <strong>ORC_FORNECEDOR_DD_MM_AAAA_R$Valor.ext</strong><br/>
                  📁 Destino: Pasta do Evento → OG | ORGANIZAÇÃO → NF ou OR | ORÇAMENTOS
                </p>
              </div>
            )}
          </div>

          {/* Card: Responsabilidades & Observações - 2 columns */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-blue-600 dark:text-blue-400">person</span>
                <h3 className="font-semibold text-gray-800 dark:text-white">Responsabilidades</h3>
              </div>

              <div className="space-y-4">
                <div className="form-group">
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">Responsável *</label>
                  <input
                    type="text"
                    name="responsavel"
                    list="responsaveis-lista"
                    value={formData.responsavel}
                    onChange={handleChange}
                    required
                    placeholder="Digite ou selecione um responsável..."
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                  <datalist id="responsaveis-lista">
                    {responsaveisDinamicos.map(r => <option key={r} value={r} />)}
                  </datalist>
                </div>

                <div className="form-group">
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">Mês de Referência *</label>
                  <select
                    name="mes_referencia"
                    value={formData.mes_referencia}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  >
                    <option value="">Selecione...</option>
                    {MESES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-blue-600 dark:text-blue-400">info</span>
                <h3 className="font-semibold text-gray-800 dark:text-white">Status & Observações</h3>
              </div>

              <div className="space-y-4">
                <div className="form-group">
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">Status Inicial</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  >
                    <option value="PENDENTE">Pendente</option>
                    <option value="RECEBIDO">Recebido</option>
                    <option value="APROVADO">Aprovado</option>
                    <option value="PAGO">Pago</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">Observações</label>
                  <textarea
                    name="observacoes"
                    value={formData.observacoes}
                    onChange={handleChange}
                    rows={2}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                    placeholder="Observações adicionais..."
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-medium rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 primary-gradient text-white font-medium rounded-xl shadow-lg shadow-blue-600/25 hover:shadow-xl hover:shadow-blue-600/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="material-symbols-outlined animate-spin">sync</span>
                  Salvando...
                </span>
              ) : (
                <>
                  <Save size={18} />
                  {isEditing ? 'Atualizar Investimento' : 'Salvar Investimento'}
                </>
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}
