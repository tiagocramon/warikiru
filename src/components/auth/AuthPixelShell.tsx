import { useEffect, useState, type ReactNode } from 'react'
import PublicHeader from '../public/PublicHeader'
import {
  isIOSStandalonePWA,
  readIOSStandaloneViewportHeight,
} from '../../hooks/useIOSKeyboardFix'

interface AuthPixelShellProps {
  title?: string
  children: ReactNode
  fullWidth?: boolean
}

export default function AuthPixelShell({
  title,
  children,
  fullWidth = false,
}: AuthPixelShellProps) {
  const standalonePWA =
    typeof window !== 'undefined' && isIOSStandalonePWA()
  const [bootstrapPending, setBootstrapPending] = useState(standalonePWA)

  useEffect(() => {
    if (!standalonePWA) {
      setBootstrapPending(false)
      return
    }

    let cancelled = false
    let bootstrapTimeoutId: number | null = null
    let phaseOneRafId: number | null = null
    let phaseTwoRafId: number | null = null
    let sampleRafId: number | null = null
    let lastHeight = 0
    let stableFrames = 0
    let samples = 0
    const root = document.documentElement
    const initialScrollY = window.scrollY

    function syncHeight() {
      const viewportHeight = readIOSStandaloneViewportHeight()
      root.style.setProperty('--app-height', `${viewportHeight}px`)
      return viewportHeight
    }

    function finishBootstrap() {
      if (cancelled) return

      window.scrollTo(0, initialScrollY)
      syncHeight()
      setBootstrapPending(false)
    }

    function sampleViewport() {
      if (cancelled) return

      const nextHeight = syncHeight()
      samples += 1

      if (Math.abs(nextHeight - lastHeight) <= 1) {
        stableFrames += 1
      } else {
        stableFrames = 0
      }

      lastHeight = nextHeight

      if (stableFrames >= 2 || samples >= 8) {
        finishBootstrap()
        return
      }

      sampleRafId = window.requestAnimationFrame(sampleViewport)
    }

    syncHeight()

    phaseOneRafId = window.requestAnimationFrame(() => {
      if (cancelled) return

      window.scrollTo(0, initialScrollY + 1)

      phaseTwoRafId = window.requestAnimationFrame(() => {
        if (cancelled) return

        window.scrollTo(0, initialScrollY)
        sampleRafId = window.requestAnimationFrame(sampleViewport)
      })
    })

    bootstrapTimeoutId = window.setTimeout(() => {
      finishBootstrap()
    }, 1200)

    return () => {
      cancelled = true

      if (bootstrapTimeoutId !== null) {
        window.clearTimeout(bootstrapTimeoutId)
      }

      if (phaseOneRafId !== null) {
        window.cancelAnimationFrame(phaseOneRafId)
      }

      if (phaseTwoRafId !== null) {
        window.cancelAnimationFrame(phaseTwoRafId)
      }

      if (sampleRafId !== null) {
        window.cancelAnimationFrame(sampleRafId)
      }
    }
  }, [standalonePWA])

  return (
    <>
      <div className={`flex min-h-app flex-col bg-[#101116] text-[#F5F7FA] ${standalonePWA && bootstrapPending ? 'invisible' : ''}`}>
        <div className="mx-auto w-full sm:max-w-[900px]">
          <PublicHeader compact />
        </div>

        <main className={`mx-auto flex flex-1 w-full flex-col px-5 pt-6 pb-[max(3rem,env(safe-area-inset-bottom,0px))] sm:max-w-[900px] sm:px-0 sm:py-12 ${fullWidth ? '' : 'sm:items-center'}`}>
          <div className={`mt-auto flex w-full ${fullWidth ? '' : 'sm:max-w-[600px]'} flex-col gap-8 rounded-[20px] bg-[#101116]`}>
            {title ? (
              <h1 className="text-[32px] font-normal leading-none text-[#F5F7FA]">
                {title}
              </h1>
            ) : null}
            {children}
          </div>
        </main>
      </div>

      {standalonePWA && bootstrapPending ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#101116]">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#F5C249] border-t-transparent" />
        </div>
      ) : null}
    </>
  )
}
