import { useNavigate } from 'react-router-dom'

interface TopNavBarProps {
  session: any
  currentPage?: string
}

export default function TopNavBar({ session, currentPage = 'dashboard' }: TopNavBarProps) {
  const navigate = useNavigate()

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', path: '/' },
    { id: 'importacao', label: 'Importação', path: '/importacao' },
    { id: 'cadastros', label: 'Cadastros', path: '/cadastros' },
    { id: 'integracoes', label: 'Integrações', path: '/integracoes' },
  ]

  return (
    <nav className="fixed top-0 w-full z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md shadow-sm flex items-center justify-between px-6 h-16 w-full">
      <div className="flex items-center gap-8">
        <span className="text-2xl font-bold tracking-tight text-blue-700 dark:text-blue-400 font-headline">SolarZ</span>
        <div className="hidden md:flex items-center gap-6">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className={`font-inter font-medium text-sm transition-colors ${
                currentPage === item.id
                  ? 'text-blue-700 dark:text-blue-400 font-semibold border-b-2 border-blue-600'
                  : 'text-slate-500 dark:text-slate-400 hover:text-blue-600'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-4">
        <button className="p-2 text-on-surface-variant hover:bg-slate-50 rounded-full transition-colors">
          <span className="material-symbols-outlined">calendar_today</span>
        </button>
        <button className="p-2 text-on-surface-variant hover:bg-slate-50 rounded-full transition-colors">
          <span className="material-symbols-outlined">filter_list</span>
        </button>
        <button className="p-2 text-on-surface-variant hover:bg-slate-50 rounded-full transition-colors">
          <span className="material-symbols-outlined">notifications</span>
        </button>
        <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden ml-2">
          {session?.user?.user_metadata?.avatar_url ? (
            <img src={session.user.user_metadata.avatar_url} alt="User" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xs font-bold text-slate-500">
              {session?.user?.email?.charAt(0).toUpperCase() || 'U'}
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}