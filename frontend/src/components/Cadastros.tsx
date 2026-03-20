import { useState, useEffect } from 'react'
import { Session } from '@supabase/supabase-js'
import { supabase } from '../App'
import TopNavBar from './layout/TopNavBar'
import SideNavBar from './layout/SideNavBar'
import BottomNavBar from './layout/BottomNavBar'
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
  email: string | null
  telefone: string | null
  categoria: string | null
  descricao: string | null
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

export default function Cadastros({ session, onClose }: CadastrosProps) {
  const [activeTab, setActiveTab] = useState<'fornecedores' | 'categorias' | 'documentos'>('fornecedores')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null)

  // Dados
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])

  // Formulários
  const [newFornecedor, setNewFornecedor] = useState({ nome: '', email: '', telefone: '', categoria: '' })
  const [editandoFornecedor, setEditandoFornecedor] = useState<Fornecedor | null>(null)
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
        .insert([{
          nome: newFornecedor.nome,
          email: newFornecedor.email || null,
          telefone: newFornecedor.telefone || null,
          categoria: newFornecedor.categoria || null,
          status: 'ativo'
        }])
        .select()

      if (error) throw error

      if (data) {
        setFornecedores([...fornecedores, data[0]])
        setNewFornecedor({ nome: '', email: '', telefone: '', categoria: '' })
        showMessage('success', 'Fornecedor adicionado!')
      }
    } catch (err: any) {
      showMessage('error', err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleEditFornecedor = async () => {
    if (!editandoFornecedor) return
    setSaving(true)
    try {
      const { error } = await supabase
        .from('fornecedores')
        .update({
          nome: editandoFornecedor.nome,
          email: editandoFornecedor.email,
          telefone: editandoFornecedor.telefone,
          categoria: editandoFornecedor.categoria
        })
        .eq('id', editandoFornecedor.id)

      if (error) throw error

      setFornecedores(fornecedores.map(f => f.id === editandoFornecedor.id ? editandoFornecedor : f))
      setEditandoFornecedor(null)
      showMessage('success', 'Fornecedor atualizado!')
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
      showMessage('error', 'Funcionalidade de upload de arquivos em desenvolvimento.')
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

  const handleLogout = async () => {
    await supabase.auth.signOut()
    onClose()
  }

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber)
  const totalPages = Math.ceil(fornecedores.length / itemsPerPage)
  const currentFornecedores = fornecedores.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <TopNavBar session={session} currentPage="cadastros" />
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
            <span className="text-gray-800 dark:text-white font-medium">Cadastros</span>
          </nav>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white font-headline flex items-center gap-3">
                <span className="material-symbols-outlined text-3xl text-blue-600 dark:text-blue-400">settings</span>
                Cadastros
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Gerenciar fornecedores, categorias e documentos
              </p>
            </div>
          </div>
        </div>

        {/* Message Toast */}
        {message && (
          <div className={`fixed top-20 right-4 z-50 px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 ${
            message.type === 'success' ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800'
          }`}>
            {message.type === 'success' ? <Check size={18} /> : <AlertCircle size={18} />}
            <span className="text-sm font-medium">{message.text}</span>
          </div>
        )}

        {/* Tabs Navigation */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-1 shadow-sm border border-slate-100 dark:border-slate-700 mb-6 inline-flex">
          <button
            onClick={() => setActiveTab('fornecedores')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'fornecedores'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
          >
            <span className="material-symbols-outlined text-lg">business</span>
            Fornecedores
          </button>
          <button
            onClick={() => setActiveTab('categorias')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'categorias'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
          >
            <span className="material-symbols-outlined text-lg">category</span>
            Categorias
          </button>
          <button
            onClick={() => setActiveTab('documentos')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'documentos'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
          >
            <span className="material-symbols-outlined text-lg">description</span>
            Boletos/NFs
          </button>
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <>
              {/* FORNECEDORES */}
              {activeTab === 'fornecedores' && (
                <div className="space-y-6">
                  {/* Filter Row - Bento Grid 5 columns */}
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-700">
                      <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Nome do fornecedor</label>
                      <input
                        type="text"
                        placeholder="Buscar..."
                        value={newFornecedor.nome}
                        onChange={(e) => setNewFornecedor({...newFornecedor, nome: e.target.value})}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-700">
                      <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Email</label>
                      <input
                        type="email"
                        placeholder="email@exemplo.com"
                        value={newFornecedor.email}
                        onChange={(e) => setNewFornecedor({...newFornecedor, email: e.target.value})}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-700">
                      <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Telefone</label>
                      <input
                        type="text"
                        placeholder="(00) 00000-0000"
                        value={newFornecedor.telefone}
                        onChange={(e) => setNewFornecedor({...newFornecedor, telefone: e.target.value})}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-700">
                      <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Categoria</label>
                      <select
                        value={newFornecedor.categoria}
                        onChange={(e) => setNewFornecedor({...newFornecedor, categoria: e.target.value})}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Todas</option>
                        <option value="ESPAÇO E INFRAESTRUTURA">Espaço e Infraestrutura</option>
                        <option value="CATERING E BEBIDAS">Catering e Bebidas</option>
                        <option value="DESLOCAMENTO E HOSPEDAGEM">Deslocamento e Hospedagem</option>
                        <option value="PRESTAÇÃO DE SERVIÇOS">Prestação de Serviços</option>
                        <option value="MATERIAIS E BRINDES">Materiais e Brindes</option>
                        <option value="DECORAÇÃO E AMBIENTE">Decoração e Ambiente</option>
                      </select>
                    </div>
                    <div className="flex items-end">
                      <button
                        onClick={handleAddFornecedor}
                        disabled={saving || !newFornecedor.nome.trim()}
                        className="w-full primary-gradient text-white py-2.5 px-4 rounded-xl font-semibold flex items-center justify-center gap-2 shadow-lg shadow-blue-900/10 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span className="material-symbols-outlined text-lg">add</span>
                        Adicionar
                      </button>
                    </div>
                  </div>

                  {/* Suppliers List - Editorial Style */}
                  <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
                    {/* Grid Header Row */}
                    <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      <div className="col-span-4">Nome / Categoria</div>
                      <div className="col-span-4">Email</div>
                      <div className="col-span-2">Telefone</div>
                      <div className="col-span-2 text-right">Ações</div>
                    </div>

                    {/* Cards */}
                    <div className="divide-y divide-slate-100 dark:divide-slate-700">
                      {currentFornecedores.map(f => (
                        <div key={f.id} className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                          {editandoFornecedor?.id === f.id ? (
                            <>
                              <div className="col-span-4 space-y-2">
                                <input
                                  type="text"
                                  value={editandoFornecedor.nome}
                                  onChange={(e) => setEditandoFornecedor({...editandoFornecedor, nome: e.target.value})}
                                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm"
                                  placeholder="Nome"
                                />
                              </div>
                              <div className="col-span-4">
                                <input
                                  type="email"
                                  value={editandoFornecedor.email || ''}
                                  onChange={(e) => setEditandoFornecedor({...editandoFornecedor, email: e.target.value})}
                                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm"
                                  placeholder="Email"
                                />
                              </div>
                              <div className="col-span-2">
                                <input
                                  type="text"
                                  value={editandoFornecedor.telefone || ''}
                                  onChange={(e) => setEditandoFornecedor({...editandoFornecedor, telefone: e.target.value})}
                                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm"
                                  placeholder="Telefone"
                                />
                              </div>
                              <div className="col-span-2 flex items-center gap-2 justify-end">
                                <button
                                  onClick={handleEditFornecedor}
                                  disabled={saving}
                                  className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                  <Save size={16} />
                                </button>
                                <button
                                  onClick={() => setEditandoFornecedor(null)}
                                  className="p-2 bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors"
                                >
                                  <X size={16} />
                                </button>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="col-span-4 flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                  <span className="material-symbols-outlined text-blue-600 dark:text-blue-400">business</span>
                                </div>
                                <div>
                                  <p className="font-medium text-gray-900 dark:text-white">{f.nome}</p>
                                  {f.categoria && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                                      {f.categoria}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="col-span-4 text-sm text-slate-600 dark:text-slate-400">
                                {f.email || '-'}
                              </div>
                              <div className="col-span-2 text-sm text-slate-600 dark:text-slate-400">
                                {f.telefone || '-'}
                              </div>
                              <div className="col-span-2 flex items-center gap-2 justify-end">
                                <button
                                  onClick={() => setEditandoFornecedor(f)}
                                  className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                  title="Editar"
                                >
                                  <Edit2 size={16} />
                                </button>
                                <button
                                  onClick={() => handleDeleteFornecedor(f.id)}
                                  className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                  title="Excluir"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      ))}
                      {fornecedores.length === 0 && (
                        <div className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                          <span className="material-symbols-outlined text-4xl mb-2">inventory_2</span>
                          <p>Nenhum fornecedor cadastrado</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => paginate(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="px-3 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span className="material-symbols-outlined text-lg">chevron_left</span>
                      </button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                        <button
                          key={page}
                          onClick={() => paginate(page)}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                            currentPage === page
                              ? 'bg-blue-600 text-white'
                              : 'text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                          }`}
                        >
                          {page}
                        </button>
                      ))}
                      <button
                        onClick={() => paginate(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="px-3 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span className="material-symbols-outlined text-lg">chevron_right</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* CATEGORIAS */}
              {activeTab === 'categorias' && (
                <div className="space-y-6">
                  {/* Add Category Form */}
                  <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700">
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Nome da categoria</label>
                        <input
                          type="text"
                          placeholder="Nova categoria..."
                          value={newCategoria.nome}
                          onChange={(e) => setNewCategoria({...newCategoria, nome: e.target.value})}
                          className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div className="flex items-center gap-4">
                        <div>
                          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Cor</label>
                          <input
                            type="color"
                            value={newCategoria.cor}
                            onChange={(e) => setNewCategoria({...newCategoria, cor: e.target.value})}
                            className="w-14 h-10 rounded-lg border border-slate-200 dark:border-slate-600 cursor-pointer"
                          />
                        </div>
                        <button
                          onClick={handleAddCategoria}
                          disabled={saving || !newCategoria.nome.trim()}
                          className="mt-5 primary-gradient text-white py-2.5 px-4 rounded-xl font-semibold flex items-center gap-2 shadow-lg shadow-blue-900/10 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <span className="material-symbols-outlined text-lg">add</span>
                          Adicionar
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Categories List */}
                  <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
                    <div className="divide-y divide-slate-100 dark:divide-slate-700">
                      {categorias.map(c => (
                        <div key={c.id} className="flex items-center justify-between px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: c.cor }}></div>
                            <span className="font-medium text-gray-900 dark:text-white">{c.nome}</span>
                          </div>
                          <button
                            onClick={() => handleDeleteCategoria(c.id)}
                            className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            title="Excluir"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                      {categorias.length === 0 && (
                        <div className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                          <span className="material-symbols-outlined text-4xl mb-2">folder_open</span>
                          <p>Nenhuma categoria cadastrada</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* BOLETOS/NFS */}
              {activeTab === 'documentos' && (
                <div className="space-y-6">
                  {/* Documents Info */}
                  <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="material-symbols-outlined text-blue-600 dark:text-blue-400">cloud_upload</span>
                      <h3 className="font-semibold text-gray-800 dark:text-white">Arquivos e Documentos</h3>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">
                      Envie os boletos e notas fiscais para a pasta do Google Drive.
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Pasta: <strong className="text-blue-600 dark:text-blue-400">FINANCEIRO</strong>
                    </p>
                  </div>

                  {uploading && (
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-700">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-blue-600"></div>
                        <span className="text-sm text-slate-600 dark:text-slate-400">Enviando arquivo...</span>
                      </div>
                      <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-600 rounded-full transition-all" style={{ width: '100%' }}></div>
                      </div>
                    </div>
                  )}

                  {/* Documents List */}
                  <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
                    <div className="divide-y divide-slate-100 dark:divide-slate-700">
                      {investimentos.map(inv => (
                        <div key={inv.id} className="flex items-center justify-between px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                              <FileText size={20} className="text-slate-500 dark:text-slate-400" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">{inv.nome_fornecedor}</p>
                              <p className="text-sm text-slate-500 dark:text-slate-400">
                                {format(new Date(inv.data_vencimento), 'dd/MM/yyyy', { locale: ptBR })} • R$ {Number(inv.valor_realizado).toLocaleString('pt-BR')}
                              </p>
                            </div>
                          </div>
                          <div>
                            {inv.link_boleto ? (
                              <a
                                href={inv.link_boleto}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                              >
                                <span className="material-symbols-outlined text-lg">visibility</span>
                                Ver arquivo
                              </a>
                            ) : (
                              <label className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors cursor-pointer">
                                <Upload size={16} />
                                Enviar
                                <input
                                  type="file"
                                  accept=".pdf,.png,.jpg,.jpeg"
                                  className="hidden"
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
                        <div className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                          <span className="material-symbols-outlined text-4xl mb-2">folder_open</span>
                          <p>Nenhum investimento encontrado</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <BottomNavBar />
    </div>
  )
}
