import { ChevronRight } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import logoHeader from '../../assets/logo-header.svg'

interface PublicHeaderProps {
  compact?: boolean
}

export default function PublicHeader({ compact = false }: PublicHeaderProps) {
  const { pathname } = useLocation()
  const isDemoPage = pathname === '/conheca-mais'
  const spacingClasses = compact
    ? 'pb-5 pt-6 pt-[max(1.5rem,env(safe-area-inset-top))]'
    : 'pb-10 pt-10 pt-[max(2.5rem,env(safe-area-inset-top))]'

  return (
    <header className={`flex items-center gap-2 px-5 sm:px-0 ${spacingClasses}`}>
      <div className="flex min-h-[56px] flex-1 items-center">
        <Link to="/">
          <img
            src={logoHeader}
            alt="Warikiru"
            width={112}
            height={56}
            className="h-14 w-28"
          />
        </Link>
      </div>

      <Link
        to={isDemoPage ? '/cadastro' : '/conheca-mais'}
        className="flex items-center gap-0.5 text-[14px] font-medium leading-none text-[#F5F7FA]"
      >
        <span>{isDemoPage ? 'Cadastrar' : 'Conheça mais'}</span>
        <ChevronRight size={20} strokeWidth={1.75} />
      </Link>
    </header>
  )
}
