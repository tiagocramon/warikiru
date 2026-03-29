import { useEffect, useState } from 'react'
import { Navigate, Outlet, Link, useOutletContext } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import Spinner from '../ui/Spinner'
import ProfileBottomSheet from '../../pages/ProfilePage'
import { UserPen, Bell, X } from 'lucide-react'
import logoHeader from '../../assets/logo-header.svg'
import { isPushSupported, subscribeToPush, isSubscribed } from '../../services/pushNotificationService'

type AppLayoutContext = {
  refreshKey: number
}

export function useAppLayout() {
  return useOutletContext<AppLayoutContext>()
}

const PUSH_DISMISSED_KEY = 'warikiru_push_dismissed'

export default function AppLayout() {
  const { user, loading, refreshUser } = useAuth()
  const [profileOpen, setProfileOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [showPushBanner, setShowPushBanner] = useState(false)

  useEffect(() => {
    if (!user) return
    const dismissed = localStorage.getItem(PUSH_DISMISSED_KEY)
    if (dismissed) return
    if (!isPushSupported()) return

    isSubscribed().then((subscribed) => {
      if (!subscribed && Notification.permission !== 'denied') {
        setShowPushBanner(true)
      }
    })
  }, [user])

  async function handleEnablePush() {
    const { error } = await subscribeToPush()
    if (error) {
      console.error('Erro ao ativar notificações:', error)
    }
    setShowPushBanner(false)
  }

  function handleDismissPush() {
    localStorage.setItem(PUSH_DISMISSED_KEY, '1')
    setShowPushBanner(false)
  }

  async function handleProfileSuccess() {
    await refreshUser()
    setProfileOpen(false)
    setRefreshKey((k) => k + 1)
  }

  if (loading) return <Spinner fullScreen />
  if (!user) return <Navigate to="/entrar" replace />

  return (
    <div className="flex min-h-[100dvh] flex-col bg-[#101116] text-[#F5F7FA]">
      <header className="sticky top-0 shrink-0 z-40 border-b border-[#16171D] bg-[#101116] pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex w-full sm:max-w-[900px] items-center gap-2 px-5 sm:px-0 py-4">
          <Link
            to="/grupos"
            className="min-w-0 flex-1"
          >
            <img
              src={logoHeader}
              alt="Warikiru"
              width={112}
              height={56}
              className="h-14 w-28"
            />
          </Link>

          <button
            onClick={() => setProfileOpen(true)}
            aria-label="Perfil"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F5F7FA]"
          >
            <UserPen size={24} className="text-[#101116]" />
          </button>
        </div>
      </header>

      {showPushBanner && (
        <div className="border-b border-[#16171D] bg-[#16171D] px-5 py-3">
          <div className="mx-auto flex w-full sm:max-w-[900px] items-center gap-3">
            <Bell size={18} className="shrink-0 text-accent" />
            <p className="min-w-0 flex-1 text-[13px] text-text-secondary">
              Ative notificações para saber quando adicionarem despesas ao seu grupo.
            </p>
            <button
              onClick={handleEnablePush}
              className="shrink-0 rounded-full bg-accent px-3 py-1.5 text-[11px] font-medium text-surface-0"
            >
              Ativar
            </button>
            <button
              onClick={handleDismissPush}
              className="shrink-0 text-text-tertiary hover:text-text-secondary"
              aria-label="Dispensar"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      <div className="mx-auto flex flex-1 w-full max-w-[900px] flex-col bg-[#101116]">
        <main className="flex flex-1 flex-col overflow-x-hidden">
          <div className="flex flex-1 flex-col">
            <Outlet context={{ refreshKey }} />
          </div>
        </main>
      </div>

      <ProfileBottomSheet
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        onSuccess={handleProfileSuccess}
      />
    </div>
  )
}
