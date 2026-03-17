import { useState, useEffect } from 'react'
import { Session } from '@supabase/supabase-js'
import { supabase } from '../App'
import { X, Check, Edit2, Save } from 'lucide-react'

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

const RESPONSAVEIS = ['Paulo Renato', 'Robson Conceição', 'Cintia']

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
    <input
      type="text"
      name={name}
      value={displayValue}
      onChange={handleChange}
      onBlur={handleBlur}
      required={required}
      placeholder={placeholder || "0,00"}
      className="currency-input"
      inputMode="decimal"
    />
  )
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export default function InvestmentForm({ session, onClose, investimento }: InvestmentFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const isEditing = !!investimento
  const [parcelas, setParcelas] = useState<string[]>([])

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

  const [formData, setFormData] = useState({
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
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const investimentoData = {
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
        responsavel_avatar: session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture || '',
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

      // Notificar no Slack
      if (!isEditing) {
        try {
          await fetch(`${API_URL}/slack/notificar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ investimento: investimentoData })
          })
        } catch {}
      }

      // Sincronizar com Google Sheets
      try {
        const res = await fetch(`${API_URL}/sheets/atualizar`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ force: true })
        })
        const sheetData = await res.json()
        console.log('Sheets sincronizado:', sheetData)
      } catch (sheetErr) {
        console.warn('Erro ao sincronizar Sheets:', sheetErr)
      }

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
      <div className="modal-overlay">
        <div className="modal-content p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">
            {isEditing ? 'Investimento Atualizado!' : 'Investimento Salvo!'}
          </h2>
          <p className="text-gray-500">Redirecionando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-800">
            {isEditing ? 'Editar Investimento' : 'Novo Investimento'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-section">
            <h3>Identificação</h3>
            <div className="form-group">
              <label>Tipo de Fornecedor *</label>
              <select name="tipo_fornecedor" value={formData.tipo_fornecedor} onChange={handleChange} required>
                <option value="">Selecione...</option>
                {TIPOS_FORNECEDOR.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Nome do Fornecedor *</label>
              <input type="text" name="nome_fornecedor" value={formData.nome_fornecedor} onChange={handleChange} required placeholder="Ex: Espaço Altus Eventos" />
            </div>
            <div className="form-group">
              <label>Descrição da Despesa *</label>
              <textarea name="descricao_despesa" value={formData.descricao_despesa} onChange={handleChange} required rows={2} />
            </div>
          </div>

          <div className="form-section">
            <h3>Informações Financeiras</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="form-group">
                <label>Valor Orçado (R$) *</label>
                <CurrencyInput
                  name="valor_orcado"
                  value={formData.valor_orcado.toString()}
                  onChange={handleChange}
                  required
                  placeholder="R$ 0,00"
                />
              </div>
              <div className="form-group">
                <label>Valor Realizado (R$) *</label>
                <CurrencyInput
                  name="valor_realizado"
                  value={formData.valor_realizado.toString()}
                  onChange={handleChange}
                  required
                  placeholder="R$ 0,00"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="form-group">
                <label>Quantidade</label>
                <input type="number" name="quantidade" value={formData.quantidade} onChange={handleChange} min="1" />
              </div>
              <div className="form-group">
                <label>Forma de Pagamento *</label>
                <select name="forma_pagamento" value={formData.forma_pagamento} onChange={handleChange} required>
                  <option value="">Selecione...</option>
                  {FORMAS_PAGAMENTO.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Parcelas</label>
                <input type="number" name="numero_parcelas" value={formData.numero_parcelas} onChange={handleChange} min="1" />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>Prazos e Documentos</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="form-group">
                <label>Data de Vencimento *</label>
                <input type="date" name="data_vencimento" value={formData.data_vencimento} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label>Número da Nota Fiscal</label>
                <input type="text" name="numero_nota_fiscal" value={formData.numero_nota_fiscal} onChange={handleChange} placeholder="NF-2026-001" />
              </div>
            </div>

            {/* Parcelas */}
            <div className="form-group" style={{marginTop: '1rem'}}>
              <label>Datas de Parcelas (uma por linha)</label>
              {parcelas.map((data, index) => (
                <div key={index} className="parcela-row">
                  <span className="parcela-num">{index + 1}ª parcela</span>
                  <input
                    type="date"
                    value={data}
                    onChange={(e) => updateParcela(index, e.target.value)}
                    className="parcela-input"
                  />
                  <button
                    type="button"
                    onClick={() => removeParcela(index)}
                    className="btn-remove-parcela"
                  >
                    ×
                  </button>
                </div>
              ))}
              <button type="button" onClick={addParcela} className="btn-add-parcela">
                + Adicionar Parcela
              </button>
            </div>
          </div>

          <div className="form-section">
            <h3>Responsabilidades</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="form-group">
                <label>Responsável *</label>
                <select name="responsavel" value={formData.responsavel} onChange={handleChange} required>
                  <option value="">Selecione...</option>
                  {RESPONSAVEIS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Mês de Referência *</label>
                <select name="mes_referencia" value={formData.mes_referencia} onChange={handleChange} required>
                  <option value="">Selecione...</option>
                  {MESES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>Observações</h3>
            <div className="form-group">
              <label>Status Inicial</label>
              <select name="status" value={formData.status} onChange={handleChange}>
                <option value="PENDENTE">Pendente</option>
                <option value="RECEBIDO">Recebido</option>
                <option value="APROVADO">Aprovado</option>
                <option value="PAGO">Pago</option>
              </select>
            </div>
            <div className="form-group">
              <label>Observações</label>
              <textarea name="observacoes" value={formData.observacoes} onChange={handleChange} rows={2} />
            </div>
          </div>

          <div className="flex gap-4">
            <button type="button" onClick={onClose} className="btn-cancel flex-1">Cancelar</button>
            <button type="submit" disabled={loading} className="btn-submit flex-1">
              {loading ? (
                'Salvando...'
              ) : (
                <>
                  <Save size={16} />
                  {isEditing ? 'Atualizar Investimento' : 'Salvar Investimento'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
