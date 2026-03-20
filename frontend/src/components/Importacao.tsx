import { useState, useRef } from 'react'
import { Session } from '@supabase/supabase-js'
import { supabase } from '../App'
import TopNavBar from './layout/TopNavBar'
import BottomNavBar from './layout/BottomNavBar'
import { X, Upload, FileText, Check, AlertCircle, ArrowRight } from 'lucide-react'

interface ImportacaoProps {
  session: Session
  onClose: () => void
}

interface ImportResult {
  success: boolean
  message: string
  count?: number
}

export default function Importacao({ session, onClose }: ImportacaoProps) {
  const [file, setFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [selectedType, setSelectedType] = useState<string>('aereo')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const importTypes = [
    { id: 'aereo', label: 'Passagens Aéreas', icon: '✈️', pattern: 'AÉREO' },
    { id: 'onibus', label: 'Passagens Ônibus', icon: '🚌', pattern: 'ONIBUS' },
    { id: 'alimentacao', label: 'Alimentação', icon: '🍽️', pattern: 'ALIMENTAÇÃO' },
    { id: 'hospedagem', label: 'Hospedagem', icon: '🏨', pattern: 'HOSPEDAGEM' },
    { id: 'uber', label: 'Uber/Trajeto', icon: '🚗', pattern: 'UBER' },
    { id: 'translado', label: 'Translado', icon: '🔄', pattern: 'TRANSLADO' },
    { id: 'voucher', label: 'Vouchers', icon: '🎫', pattern: 'VOUCHER' },
    { id: 'funcionarios', label: 'Funcionários', icon: '👥', pattern: 'FUNCIONÁRIOS' },
  ]

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setResult(null)
    }
  }

  const parseCSV = async (): Promise<any[]> => {
    if (!file) return []

    const text = await file.text()
    const lines = text.split('\n').filter(line => line.trim())

    // Pular primeira linha se for cabeçalho com emoji ou texto
    const hasHeader = lines[0]?.includes('NOME') || lines[0]?.includes('Nome')
    const startIndex = hasHeader ? 1 : 0
    const dataLines = lines.slice(startIndex)

    const data: any[] = []
    for (const line of dataLines) {
      // Parse CSV simples
      const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''))
      if (values.length > 1 && values[0]) {
        data.push(values)
      }
    }

    return data
  }

  const importData = async () => {
    if (!file) return

    setImporting(true)
    setResult(null)

    try {
      const data = await parseCSV()

      if (data.length === 0) {
        setResult({ success: false, message: 'Nenhum dado encontrado no arquivo' })
        setImporting(false)
        return
      }

      // Mapear conforme tipo de importação
      let insertedCount = 0

      if (selectedType === 'aereo' || selectedType === 'onibus') {
        // Extrair evento do nome do arquivo (ex: "Imersão_GALAXY MAR_26")
        const eventoMatch = file?.name.match(/(Imersão_GALAXY|Intersolar|SolarZ)/i)
        const eventoNome = eventoMatch ? eventoMatch[0] : 'Evento'

        // Formato: Nome, DataNasc, CPF, Email, Setor, Ida, Hora, Trecho, VooIda, Cia, HoraChegada, Volta, Hora, Trecho, VooVolta, Cia, HoraChegada, Valor, Data, Link
        for (const row of data) {
          // Pular linhas vazias ou cabeçalhos
          if (!row[0] || row[0]?.includes('NOME')) continue
          const nome = row[0]
          if (!nome || nome.length < 3) continue

          const cpf = row[2]
          const email = row[3]

          // Dados da ida
          const dataIda = row[5]
          const horaIda = row[6]
          const trechoIda = row[7]
          const vooIda = row[8]
          const ciaIda = row[9]

          // Dados da volta
          const dataVolta = row[11] || row[10]
          const horaVolta = row[12] || row[11]
          const trechoVolta = row[13] || row[12]
          const vooVolta = row[14] || row[13]
          const ciaVolta = row[15] || row[14]

          // Valor - formato brasileiro "R$ 2.329,54"
          let valor = 0
          const valorRaw = row[17] || row[16]
          if (valorRaw) {
            const cleaned = valorRaw.replace(/R\$\s?/g, '').replace(/\./g, '').replace(',', '.')
            valor = parseFloat(cleaned) || 0
          }

          if (nome) {
            // Inserir funcionário (opcional)
            if (cpf && nome) {
              await supabase.from('funcionarios').upsert({
                nome,
                cpf,
                email,
                user_id: session.user.id
              }, { onConflict: 'cpf' }).catch(() => {})
            }

            // Inserir passagem com evento
            await supabase.from('passagens').insert({
              tipo: selectedType === 'aereo' ? 'aereo' : 'onibus',
              nome_passageiro: nome,
              cpf,
              email,
              data_ida: dataIda ? new Date(dataIda.split('/').reverse().join('-')).toISOString() : null,
              hora_ida: horaIda || null,
              trecho_ida: trechoIda || null,
              numero_voo_ida: vooIda || null,
              Companhia_ida: ciaIda || null,
              data_volta: dataVolta ? new Date(dataVolta.split('/').reverse().join('-')).toISOString() : null,
              hora_volta: horaVolta || null,
              trecho_volta: trechoVolta || null,
              numero_voo_volta: vooVolta || null,
              companhia_volta: ciaVolta || null,
              valor: valor,
              evento: eventoNome,
              user_id: session.user.id
            })
            insertedCount++
          }
        }
      } else if (selectedType === 'funcionarios') {
        // Formato CSV: Nome, Data de Nascimento, CPF, Email, Telefone
        for (const row of data) {
          await supabase.from('funcionarios').upsert({
            nome: row[0],
            data_nascimento: row[1] ? new Date(row[1].split('/').reverse().join('-')).toISOString() : null,
            cpf: row[2],
            email: row[3],
            telefone: row[4] || null,
            user_id: session.user.id
          }, { onConflict: 'cpf' })
          insertedCount++
        }
      } else {
        // Outros tipos - genérico
        setResult({ success: false, message: `Tipo ${selectedType} ainda não implementado para importação` })
        setImporting(false)
        return
      }

      setResult({
        success: true,
        message: `Importação concluída com sucesso!`,
        count: insertedCount
      })
      setFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''

    } catch (err: any) {
      setResult({ success: false, message: err.message || 'Erro ao importar' })
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <TopNavBar session={session} currentPage="importacao" />

      <main className="pt-20 pb-8 px-4 md:px-6 lg:px-8 max-w-6xl mx-auto">
        {/* Breadcrumb Header */}
        <div className="mb-6">
          <nav className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-2">
            <button onClick={onClose} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              <span className="material-symbols-outlined text-lg">arrow_back</span>
            </button>
            <span className="material-symbols-outlined text-sm">chevron_right</span>
            <span>Dashboard</span>
            <span className="material-symbols-outlined text-sm">chevron_right</span>
            <span className="text-gray-800 dark:text-white font-medium">Importação em Lote</span>
          </nav>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white font-headline">
                Importação em Lote
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Importe dados de planilhas CSV para cadastro automático
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button className="hidden md:flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                <span className="material-symbols-outlined text-lg">share</span>
                Compartilhar
              </button>
              <button className="hidden md:flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                <span className="material-symbols-outlined text-lg">download</span>
                Exportar
              </button>
            </div>
          </div>
        </div>

        {/* Page Canvas */}
        <div className="space-y-6">
          {/* Section: Selecione o tipo de importação */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-1">
                Selecione o tipo de importação
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Escolha a categoria dos dados que deseja importar
              </p>
            </div>

            {/* Bento Grid - 4 columns */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {importTypes.map(type => (
                <button
                  key={type.id}
                  onClick={() => setSelectedType(type.id)}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                    selectedType === type.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-slate-100 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                  }`}
                >
                  <span className="material-symbols-outlined text-2xl text-blue-600 dark:text-blue-400">
                    {type.id === 'aereo' ? 'flight' :
                     type.id === 'onibus' ? 'directions_bus' :
                     type.id === 'alimentacao' ? 'restaurant' :
                     type.id === 'hospedagem' ? 'hotel' :
                     type.id === 'uber' ? 'directions_car' :
                     type.id === 'translado' ? 'sync_alt' :
                     type.id === 'voucher' ? 'confirmation_number' :
                     type.id === 'funcionarios' ? 'groups' : 'upload_file'}
                  </span>
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300 text-center">
                    {type.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Drag-and-drop Upload Area */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700">
            <div className="border-2 border-dashed border-slate-200 dark:border-slate-600 rounded-xl p-8 text-center hover:border-blue-400 dark:hover:border-blue-500 transition-colors">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt"
                onChange={handleFileSelect}
                className="hidden"
              />
              <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                  <span className="material-symbols-outlined text-2xl text-blue-600 dark:text-blue-400">upload_file</span>
                </div>
                <div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="text-blue-600 dark:text-blue-400 font-medium hover:underline"
                  >
                    Clique para selecionar
                  </button>
                  <span className="text-slate-500 dark:text-slate-400"> ou arraste o arquivo aqui</span>
                </div>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  Formato suportado: CSV ou TXT
                </p>
              </div>
            </div>

            {/* Selected File */}
            {file && (
              <div className="mt-4 flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-xl text-slate-500">description</span>
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{file.name}</span>
                </div>
                <button
                  onClick={() => { setFile(null); if (fileInputRef.current) fileInputRef.current.value = '' }}
                  className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
            )}

            {/* Import Button */}
            {file && (
              <button
                onClick={importData}
                disabled={importing}
                className="mt-4 w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-xl transition-colors"
              >
                {importing ? (
                  <>
                    <span className="material-symbols-outlined animate-spin">sync</span>
                    Importando...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined">upload</span>
                    Importar Dados
                  </>
                )}
              </button>
            )}

            {/* Result Message */}
            {result && (
              <div className={`mt-4 flex items-center gap-3 p-4 rounded-xl ${
                result.success
                  ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                  : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
              }`}>
                <span className="material-symbols-outlined">
                  {result.success ? 'check_circle' : 'error'}
                </span>
                <span className="text-sm font-medium">{result.message}</span>
                {result.count && (
                  <span className="text-sm font-semibold">({result.count} registros)</span>
                )}
              </div>
            )}
          </div>

          {/* Help Section - Asymmetric 1/3 + 2/3 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Left: Tips */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl p-5 border border-blue-100 dark:border-blue-800">
              <div className="flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-blue-600 dark:text-blue-400">lightbulb</span>
                <h3 className="font-semibold text-gray-800 dark:text-white">Dicas</h3>
              </div>
              <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
                <li className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-xs text-blue-500">check</span>
                  Use arquivos CSV formatados
                </li>
                <li className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-xs text-blue-500">check</span>
                  Verifique os dados antes de importar
                </li>
                <li className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-xs text-blue-500">check</span>
                 makeBackup dos seus dados
                </li>
              </ul>
            </div>

            {/* Right: Format Guide */}
            <div className="md:col-span-2 bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-purple-600 dark:text-purple-400">description</span>
                <h3 className="font-semibold text-gray-800 dark:text-white">Formato Esperado</h3>
              </div>
              <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-4 overflow-x-auto">
                <code className="text-xs text-slate-600 dark:text-slate-400 whitespace-pre">
{selectedType === 'aereo' || selectedType === 'onibus'
  ? `Nome, DataNasc, CPF, Email, Setor, Ida, Hora, Trecho, VooIda, Cia, HoraChegada, Volta, Hora, Trecho, VooVolta, Cia, HoraChegada, Valor, Data, Link`
  : selectedType === 'funcionarios'
  ? `Nome, Data de Nascimento, CPF, Email, Telefone`
  : `Coluna1, Coluna2, Coluna3, ...`}
                </code>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-3">
                O tipo "<strong>{importTypes.find(t => t.id === selectedType)?.label}</strong>" está selecionado
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <BottomNavBar />
    </div>
  )
}