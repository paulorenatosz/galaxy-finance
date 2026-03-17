import { useState, useEffect } from 'react'
import { Session } from '@supabase/supabase-js'
import { supabase } from '../App'
import {
  Settings, Plus, Trash2, Edit2, Save, X, Upload,
  FileText, Building, Tag, FolderOpen, Check, AlertCircle
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

// Tipos de dados para cadastros
interface Fornecedor {
  id: string
  nome: string
  tipo: string
  contato: string
  created_at: string
}

interface Categoria {
  id: string
  nome: string
  cor: string
}

interface CadastrosProps {
  session: Session
  onClose: () => void
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export default function Cadastros({ session, onClose }: CadastrosProps) {
  const [activeTab, setActiveTab] = useState<'fornecedores' | 'categorias' | 'documentos'>('fornecedores')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null)

  // Dados
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])

  // Formulários
  const [newFornecedor, setNewFornecedor] = useState({ nome: '', tipo: '', contato: '' })
  const [newCategoria, setNewCategoria] = useState({ nome: '', cor: '#0066CC' })
  const [editingId, setEditingId] = useState<string | null>(null)

  // Upload de documentos
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [investimentos, setInvestimentos] = useState<any[]>([])

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [fornecedoresRes, categoriasRes, investimentosRes] = await Promise.all([
        supabase.from('fornecedores').select('*').order('nome'),
        supabase.from('categorias').select('*').order('nome'),
        supabase.from('investimentos').select('*').order('data_vencimento', { ascending: false })
      ])

      if (fornecedoresRes.data) setFornecedores(fornecedoresRes.data)
      if (categoriasRes.data) setCategorias(categoriasRes.data)
      if (investimentosRes.data) setInvestimentos(investimentosRes.data)
    } catch (err) {
      console.error('Erro ao carregar dados:', err)
    } finally {
      setLoading(false)
    }
  }

  // Fornecedores
  const handleAddFornecedor = async () => {
    if (!newFornecedor.nome.trim()) return
    setSaving(true)
    try {
      const { data, error } = await supabase
        .from('fornecedores')
        .insert([{ ...newFornecedor, user_id: session.user.id }])
        .select()

      if (error) throw error

      if (data) {
        setFornecedores([...fornecedores, data[0]])
        setNewFornecedor({ nome: '', tipo: '', contato: '' })
        showMessage('success', 'Fornecedor adicionado!')
      }
    } catch (err: any) {
      showMessage('error', err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteFornecedor = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir?')) return
    try {
      await supabase.from('fornecedores').delete().eq('id', id)
      setFornecedores(fornecedores.filter(f => f.id !== id))
      showMessage('success', 'Fornecedor excluído!')
    } catch (err: any) {
      showMessage('error', err.message)
    }
  }

  // Categorias
  const handleAddCategoria = async () => {
    if (!newCategoria.nome.trim()) return
    setSaving(true)
    try {
      const { data, error } = await supabase
        .from('categorias')
        .insert([newCategoria])
        .select()

      if (error) throw error

      if (data) {
        setCategorias([...categorias, data[0]])
        setNewCategoria({ nome: '', cor: '#0066CC' })
        showMessage('success', 'Categoria adicionada!')
      }
    } catch (err: any) {
      showMessage('error', err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteCategoria = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir?')) return
    try {
      await supabase.from('categorias').delete().eq('id', id)
      setCategorias(categorias.filter(c => c.id !== id))
      showMessage('success', 'Categoria excluída!')
    } catch (err: any) {
      showMessage('error', err.message)
    }
  }

  // Upload de Boleto para Google Drive
  const handleUploadBoleto = async (investimentoId: string, file: File) => {
    setUploading(true)
    setUploadProgress(0)

    try {
      // Primeiro, fazer upload para o backend que envia para o Drive
      const formData = new FormData()
      formData.append('file', file)
      formData.append('investimento_id', investimentoId)

      const res = await fetch(`${API_URL}/drive/upload-boleto`, {
        method: 'POST',
        body: formData
      })

      const data = await res.json()

      if (data.error) {
        showMessage('error', data.error)
      } else {
        // Atualizar o investimento com o link do arquivo
        await supabase
          .from('investimentos')
          .update({ link_boleto: data.webViewLink })
          .eq('id', investimentoId)

        showMessage('success', 'Boleto enviado com sucesso!')
        loadData()
      }
    } catch (err: any) {
      showMessage('error', 'Erro ao enviar boleto: ' + err.message)
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 3000)
  }

  return (
    <div className="cadastros-container">
      {/* Header */}
      <header className="cadastros-header">
        <div className="header-content">
          <div className="logo-section">
            <div className="logo-icon">
              <Settings size={20} />
            </div>
            <div className="logo-text">
              <h1>Cadastros</h1>
              <p>Gerenciar fornecedores, categorias e documentos</p>
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
          {message.type === 'success' ? <Check size={18} /> : <AlertCircle size={18} />}
          {message.text}
        </div>
      )}

      {/* Tabs */}
      <div className="tabs">
        <button
          className={`tab ${activeTab === 'fornecedores' ? 'active' : ''}`}
          onClick={() => setActiveTab('fornecedores')}
        >
          <Building size={18} />
          Fornecedores
        </button>
        <button
          className={`tab ${activeTab === 'categorias' ? 'active' : ''}`}
          onClick={() => setActiveTab('categorias')}
        >
          <Tag size={18} />
          Categorias
        </button>
        <button
          className={`tab ${activeTab === 'documentos' ? 'active' : ''}`}
          onClick={() => setActiveTab('documentos')}
        >
          <FolderOpen size={18} />
          Boletos/NFs
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {loading ? (
          <div className="loading">Carregando...</div>
        ) : (
          <>
            {/* FORNECEDORES */}
            {activeTab === 'fornecedores' && (
              <div className="tab-panel">
                <div className="add-form">
                  <input
                    type="text"
                    placeholder="Nome do fornecedor"
                    value={newFornecedor.nome}
                    onChange={(e) => setNewFornecedor({...newFornecedor, nome: e.target.value})}
                    className="form-input"
                  />
                  <select
                    value={newFornecedor.tipo}
                    onChange={(e) => setNewFornecedor({...newFornecedor, tipo: e.target.value})}
                    className="form-select"
                  >
                    <option value="">Selecione o tipo</option>
                    <option value="ESPAÇO E INFRAESTRUTURA">Espaço e Infraestrutura</option>
                    <option value="CATERING E BEBIDAS">Catering e Bebidas</option>
                    <option value="DESLOCAMENTO E HOSPEDAGEM">Deslocamento e Hospedagem</option>
                    <option value="PRESTAÇÃO DE SERVIÇOS">Prestação de Serviços</option>
                    <option value="MATERIAIS E BRINDES">Materiais e Brindes</option>
                    <option value="DECORAÇÃO E AMBIENTE">Decoração e Ambiente</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Contato (email/telefone)"
                    value={newFornecedor.contato}
                    onChange={(e) => setNewFornecedor({...newFornecedor, contato: e.target.value})}
                    className="form-input"
                  />
                  <button
                    onClick={handleAddFornecedor}
                    disabled={saving || !newFornecedor.nome.trim()}
                    className="btn btn-primary"
                  >
                    <Plus size={16} />
                    Adicionar
                  </button>
                </div>

                <div className="list">
                  {fornecedores.map(f => (
                    <div key={f.id} className="list-item">
                      <div className="item-info">
                        <span className="item-name">{f.nome}</span>
                        <span className="item-meta">{f.tipo} • {f.contato}</span>
                      </div>
                      <button
                        onClick={() => handleDeleteFornecedor(f.id)}
                        className="btn-icon delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                  {fornecedores.length === 0 && (
                    <div className="empty">Nenhum fornecedor cadastrado</div>
                  )}
                </div>
              </div>
            )}

            {/* CATEGORIAS */}
            {activeTab === 'categorias' && (
              <div className="tab-panel">
                <div className="add-form">
                  <input
                    type="text"
                    placeholder="Nome da categoria"
                    value={newCategoria.nome}
                    onChange={(e) => setNewCategoria({...newCategoria, nome: e.target.value})}
                    className="form-input"
                  />
                  <input
                    type="color"
                    value={newCategoria.cor}
                    onChange={(e) => setNewCategoria({...newCategoria, cor: e.target.value})}
                    className="form-color"
                  />
                  <button
                    onClick={handleAddCategoria}
                    disabled={saving || !newCategoria.nome.trim()}
                    className="btn btn-primary"
                  >
                    <Plus size={16} />
                    Adicionar
                  </button>
                </div>

                <div className="list">
                  {categorias.map(c => (
                    <div key={c.id} className="list-item">
                      <div className="item-info">
                        <span className="color-dot" style={{backgroundColor: c.cor}}></span>
                        <span className="item-name">{c.nome}</span>
                      </div>
                      <button
                        onClick={() => handleDeleteCategoria(c.id)}
                        className="btn-icon delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                  {categorias.length === 0 && (
                    <div className="empty">Nenhuma categoria cadastrada</div>
                  )}
                </div>
              </div>
            )}

            {/* BOLETOS/NFS */}
            {activeTab === 'documentos' && (
              <div className="tab-panel">
                <div className="documents-info">
                  <p>Envie os boletos e notas fiscais para a pasta do Google Drive.</p>
                  <p className="info-secondary">Pasta: <strong>FINANCEIRO</strong></p>
                </div>

                {uploading && (
                  <div className="upload-progress">
                    <div className="progress-bar">
                      <div className="progress-fill" style={{width: '100%'}}></div>
                    </div>
                    <span>Enviando arquivo...</span>
                  </div>
                )}

                <div className="documents-list">
                  {investimentos.map(inv => (
                    <div key={inv.id} className="document-item">
                      <div className="doc-info">
                        <FileText size={18} />
                        <div>
                          <span className="doc-name">{inv.nome_fornecedor}</span>
                          <span className="doc-meta">
                            {format(new Date(inv.data_vencimento), 'dd/MM/yyyy', { locale: ptBR })} •
                            R$ {Number(inv.valor_realizado).toLocaleString('pt-BR')}
                          </span>
                        </div>
                      </div>
                      <div className="doc-actions">
                        {inv.link_boleto ? (
                          <a
                            href={inv.link_boleto}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-secondary btn-sm"
                          >
                            Ver arquivo
                          </a>
                        ) : (
                          <label className="btn btn-primary btn-sm upload-btn">
                            <Upload size={14} />
                            Enviar
                            <input
                              type="file"
                              accept=".pdf,.png,.jpg,.jpeg"
                              style={{display: 'none'}}
                              onChange={(e) => {
                                const file = e.target.files?.[0]
                                if (file) handleUploadBoleto(inv.id, file)
                              }}
                            />
                          </label>
                        )}
                      </div>
                    </div>
                  ))}
                  {investimentos.length === 0 && (
                    <div className="empty">Nenhum investimento encontrado</div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
