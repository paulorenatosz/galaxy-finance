import { useState } from 'react'
import { Session } from '@supabase/supabase-js'
import { supabase } from '../App'
import TopNavBar from './layout/TopNavBar'
import SideNavBar from './layout/SideNavBar'
import BottomNavBar from './layout/BottomNavBar'

interface EventoExecucao {
  id: string
  nome: string
  orcado: number
  realizado: number
}

interface ConsultaProps {
  session: Session
  onClose: () => void
}

export default function Consulta({ session, onClose }: ConsultaProps) {
  // Execução por Evento state
  const [eventos] = useState<EventoExecucao[]>([
    { id: '1', nome: 'Feira Tech 2026', orcado: 150000, realizado: 125000 },
    { id: '2', nome: 'Campanha Digital Q1', orcado: 80000, realizado: 72000 },
    { id: '3', nome: 'Evento Parceiros', orcado: 50000, realizado: 48000 },
    { id: '4', nome: 'Workshop Clients', orcado: 35000, realizado: 28000 },
    { id: '5', nome: 'Conferência Anual', orcado: 120000, realizado: 95000 },
    { id: '6', nome: 'Launch Producto X', orcado: 90000, realizado: 85000 },
    { id: '7', nome: 'Brand Awareness', orcado: 60000, realizado: 45000 },
    { id: '8', nome: 'Seminário Setorial', orcado: 40000, realizado: 38000 },
    { id: '9', nome: 'Roadshow Regional', orcado: 75000, realizado: 60000 },
    { id: '10', nome: 'Meetup Tech', orcado: 25000, realizado: 22000 },
    { id: '11', nome: 'Expo Indústria', orcado: 55000, realizado: 48000 },
    { id: '12', nome: 'Summit Liderança', orcado: 45000, realizado: 42000 },
  ])
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 5

  const totalPages = Math.ceil(eventos.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const eventosPaginados = eventos.slice(startIndex, startIndex + itemsPerPage)

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <TopNavBar session={session} currentPage="execucao" />
      <SideNavBar onLogout={handleLogout} />

      <main className="pt-20 pb-8 px-4 md:px-6 lg:px-8 max-w-6xl mx-auto lg:ml-64">
        {/* Breadcrumb Header */}
        <div className="mb-6">
          <nav className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-2">
            <button onClick={onClose} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              <span className="material-symbols-outlined text-lg">arrow_back</span>
            </button>
            <span className="material-symbols-outlined text-sm">chevron_right</span>
            <span>Financials</span>
            <span className="material-symbols-outlined text-sm">chevron_right</span>
            <span className="text-gray-800 dark:text-white font-medium">Execução por Evento</span>
          </nav>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white font-headline flex items-center gap-3">
                <span className="material-symbols-outlined text-3xl text-blue-600 dark:text-blue-400">account_balance</span>
                Execução Orçamentária por Evento
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Acompanhamento de orçamento versus realizado por evento de marketing
              </p>
            </div>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
            <span className="material-symbols-outlined text-lg">calendar_month</span>
            Este Trimestre
            <span className="material-symbols-outlined text-sm">expand_more</span>
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium shadow-lg shadow-blue-900/20">
            <span className="material-symbols-outlined text-lg">event</span>
            Março 2026
            <span className="material-symbols-outlined text-sm">expand_more</span>
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
            <span className="material-symbols-outlined text-lg">download</span>
            Exportar
          </button>
        </div>

        {/* Chart Section - Orçado vs Realizado */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 mb-6">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white font-headline">Orçado vs Realizado</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Top 5 Eventos de Marketing</p>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-6 mb-6">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span className="text-sm text-slate-600 dark:text-slate-400">Orçado</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
              <span className="text-sm text-slate-600 dark:text-slate-400">Realizado</span>
            </div>
          </div>

          {/* Horizontal Bar Chart */}
          <div className="space-y-4">
            {eventos.slice(0, 5).map((evento) => {
              const maxValue = Math.max(...eventos.slice(0, 5).map(e => e.orcado))
              const orcadoPercent = (evento.orcado / maxValue) * 100
              const realizadoPercent = (evento.realizado / maxValue) * 100

              return (
                <div key={evento.id} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{evento.nome}</span>
                    <div className="flex items-center gap-4 text-xs">
                      <span className="text-slate-500">Orçado: {formatCurrency(evento.orcado)}</span>
                      <span className="text-emerald-600 dark:text-emerald-400">Realizado: {formatCurrency(evento.realizado)}</span>
                    </div>
                  </div>
                  <div className="relative h-6 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    {/* Orçado bar */}
                    <div
                      className="absolute top-0 left-0 h-full bg-blue-500 rounded-full"
                      style={{ width: `${orcadoPercent}%` }}
                    ></div>
                    {/* Realizado bar */}
                    <div
                      className="absolute top-0 left-0 h-full bg-emerald-500 rounded-full opacity-80"
                      style={{ width: `${realizadoPercent}%` }}
                    ></div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Table Section - Detalhamento de Eventos */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
          <div className="p-6 border-b border-slate-100 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white font-headline">Detalhamento de Eventos</h2>
              <div className="flex items-center gap-3">
                <button className="flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
                  <span className="material-symbols-outlined text-lg">filter_list</span>
                  Filtrar
                </button>
                <button className="flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
                  <span className="material-symbols-outlined text-lg">download</span>
                  Baixar
                </button>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/50">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Evento</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Orçamento</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Realizado</th>
                  <th className="text-center px-6 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Execução (%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {eventosPaginados.map(evento => {
                  const execucaoPercent = evento.orcado > 0 ? (evento.realizado / evento.orcado) * 100 : 0
                  const progressColor = execucaoPercent >= 90 ? 'bg-emerald-500' : execucaoPercent >= 70 ? 'bg-amber-500' : 'bg-red-500'

                  return (
                    <tr key={evento.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                      <td className="px-6 py-4">
                        <span className="text-sm font-medium text-slate-900 dark:text-white">{evento.nome}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{formatCurrency(evento.orcado)}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(evento.realizado)}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-3">
                          <div className="flex-1 max-w-[100px] h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${progressColor} rounded-full`}
                              style={{ width: `${Math.min(execucaoPercent, 100)}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 w-14 text-right">
                            {execucaoPercent.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <span className="text-sm text-slate-500 dark:text-slate-400">
              Mostrando {eventosPaginados.length} de {eventos.length} eventos
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <span className="material-symbols-outlined text-lg">chevron_left</span>
                Anterior
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Próximo
                <span className="material-symbols-outlined text-lg">chevron_right</span>
              </button>
            </div>
          </div>
        </div>
      </main>

      <BottomNavBar />
    </div>
  )
}
