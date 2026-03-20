import { useNavigate, useLocation } from 'react-router-dom'

export default function BottomNavBar() {
  const navigate = useNavigate()
  const location = useLocation()

  const navItems = [
    { id: 'inicio', label: 'Início', icon: 'dashboard', path: '/' },
    { id: 'importar', label: 'Importar', icon: 'upload_file', path: '/importacao' },
    { id: 'cadastros', label: 'Cadastros', icon: 'receipt_long', path: '/cadastros' },
    { id: 'perfil', label: 'Perfil', icon: 'person', path: '/perfil' },
  ]

  return (
    <div className="md:hidden fixed bottom-0 w-full bg-white/90 backdrop-blur-lg border-t border-slate-100 flex items-center justify-around h-16 px-4 z-50">
      {navItems.map((item) => (
        <button
          key={item.id}
          onClick={() => navigate(item.path)}
          className={`flex flex-col items-center gap-1 ${
            location.pathname === item.path ? 'text-primary' : 'text-slate-400'
          }`}
        >
          <span className="material-symbols-outlined text-xl">
            {item.icon}
          </span>
          <span className={`text-[10px] font-medium ${location.pathname === item.path ? 'font-bold' : ''}`}>
            {item.label}
          </span>
        </button>
      ))}
    </div>
  )
}