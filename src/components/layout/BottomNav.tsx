import { useLocation, useNavigate } from 'react-router-dom'
import { LayoutGrid, PlusCircle } from 'lucide-react'

const tabs = [
  { key: '/grupos', icon: LayoutGrid, label: 'Grupos' },
  { key: '/grupos/novo', icon: PlusCircle, label: 'Novo' },
]

export default function BottomNav() {
  const location = useLocation()
  const navigate = useNavigate()

  const isActive = (path: string) => {
    if (path === '/grupos') {
      return location.pathname === '/grupos' || location.pathname.startsWith('/grupos/')
    }
    return location.pathname.startsWith(path)
  }

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-surface-1/80 backdrop-blur-xl border-t border-border sm:hidden">
      <div className="flex justify-around items-center h-16 pb-safe">
        {tabs.map((tab) => {
          const active = isActive(tab.key)
          return (
            <button
              key={tab.key}
              onClick={() => navigate(tab.key)}
              className={`flex flex-col items-center gap-1 px-4 py-2 transition-colors ${
                active ? 'text-accent' : 'text-text-tertiary'
              }`}
            >
              <tab.icon size={22} strokeWidth={active ? 2.5 : 1.5} />
              <span className="text-caption">{tab.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
