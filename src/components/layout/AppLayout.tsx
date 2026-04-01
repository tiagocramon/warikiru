import { useEffect, useState } from 'react'
import { Navigate, Outlet, Link, useOutletContext } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import Spinner from '../ui/Spinner'
import ProfileBottomSheet from '../../pages/ProfilePage'
import { UserPen } from 'lucide-react'
import logoHeader from '../../assets/logo-header.svg'
import { isPushSupported, subscribeToPush, isSubscribed } from '../../services/pushNotificationService'

type AppLayoutContext = {
  refreshKey: number
}

export function useAppLayout() {
  return useOutletContext<AppLayoutContext>()
}

export default function AppLayout() {
  const { user, loading, refreshUser } = useAuth()
  const [profileOpen, setProfileOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  // Auto-subscribe to push notifications on login
  useEffect(() => {
    if (!user) return
    if (!isPushSupported()) return

    isSubscribed().then((subscribed) => {
      if (!subscribed && Notification.permission !== 'denied') {
        subscribeToPush()
      }
    })
  }, [user])

  async function handleProfileSuccess() {
    await refreshUser()
    setProfileOpen(false)
    setRefreshKey((k) => k + 1)
  }

  if (loading) return <Spinner fullScreen />
  if (!user) return <Navigate to="/entrar" replace />

  return (
    <div className="flex min-h-app flex-col bg-[#101116] text-[#F5F7FA]">
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
