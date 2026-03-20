import { useNavigate, useLocation } from 'react-router-dom'

interface SideNavBarProps {
  onLogout: () => void
}

export default function SideNavBar({ onLogout }: SideNavBarProps) {
  const navigate = useNavigate()
  const location = useLocation()

  const menuItems = [
    { id: 'dashboard', label: 'Visão Geral', icon: 'dashboard', path: '/' },
    { id: 'importar', label: 'Importar Lote', icon: 'upload_file', path: '/importacao' },
    { id: 'cadastros', label: 'Gerenciar Cadastros', icon: 'receipt_long', path: '/cadastros' },
    { id: 'integracoes', label: 'Conectar Apps', icon: 'hub', path: '/integracoes' },
  ]

  const isActive = (path: string) => location.pathname === path

  return (
    <aside className="h-screen w-64 fixed left-0 top-0 bg-slate-50 dark:bg-slate-950 flex flex-col py-6 px-4 hidden lg:flex border-r border-slate-100 dark:border-slate-800 pt-20">
      <div className="mb-8 px-2">
        <h2 className="font-bold text-blue-700 font-headline text-lg">Financeiro</h2>
        <p className="text-xs text-on-surface-variant">Solar Intelligence</p>
      </div>

      <button
        onClick={() => navigate('/novo-investimento')}
        className="w-full primary-gradient text-white py-3 px-4 rounded-xl font-semibold mb-8 flex items-center justify-center gap-2 shadow-lg shadow-blue-900/10"
      >
        <span className="material-symbols-outlined text-sm">add</span>
        Novo Lançamento
      </button>

      <nav className="flex-1 space-y-1">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => navigate(item.path)}
            className={`flex items-center gap-3 px-3 py-2 w-full text-left transition-all duration-200 rounded-lg group ${
              isActive(item.path)
                ? 'bg-white dark:bg-slate-800 text-blue-700 dark:text-blue-300 rounded-lg shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 hover:pl-2'
            }`}
          >
            <span className={`material-symbols-outlined text-xl ${isActive(item.path) ? '' : 'group-hover:text-blue-600'}`}>
              {item.icon}
            </span>
            <span className="font-headline text-base">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="mt-auto space-y-1 pt-6 border-t border-slate-200 dark:border-slate-800">
        <button className="flex items-center gap-3 px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-all w-full">
          <span className="material-symbols-outlined text-xl">settings</span>
          <span className="font-headline text-base">Configurações</span>
        </button>
        <button
          onClick={onLogout}
          className="flex items-center gap-3 px-3 py-2 text-red-500 hover:bg-red-50 rounded-lg transition-all w-full"
        >
          <span className="material-symbols-outlined text-xl">logout</span>
          <span className="font-headline text-base">Sair</span>
        </button>
      </div>
    </aside>
  )
}