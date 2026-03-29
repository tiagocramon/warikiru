import { Navigate, Outlet, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import Spinner from '../ui/Spinner'
import logoHeader from '../../assets/logo-header.svg'

function getSafeRedirect(value: string | null) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/grupos'
  return value
}

export default function AuthLayout() {
  const { user, loading } = useAuth()
  const [searchParams] = useSearchParams()
  const redirectTo = getSafeRedirect(searchParams.get('redirect'))

  if (loading) return <Spinner fullScreen />
  if (user) return <Navigate to={redirectTo} replace />

  return (
    <div className="min-h-screen bg-surface-0 flex flex-col items-center justify-center p-4 pt-[max(1rem,env(safe-area-inset-top))] relative">
      {/* Subtle gradient background */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,rgba(245,194,73,0.05),transparent_70%)] pointer-events-none" />

      <div className="relative w-full max-w-sm">
        {/* Branding */}
        <div className="flex flex-col items-center mb-8">
          <img src={logoHeader} alt="Warikiru" width={112} height={56} />
          <p className="text-body-sm text-text-tertiary mt-2">
            Divida contas sem complicacao
          </p>
        </div>

        <Outlet />
      </div>
    </div>
  )
}
