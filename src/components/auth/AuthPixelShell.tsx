import { useEffect, type ReactNode } from 'react'
import PublicHeader from '../public/PublicHeader'
import { isIOSStandalonePWA } from '../../hooks/useIOSKeyboardFix'

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

  useEffect(() => {
    if (!standalonePWA) return

    const htmlStyle = document.documentElement.style
    const bodyStyle = document.body.style
    const scrollY = window.scrollY

    const previousHtmlOverflow = htmlStyle.overflow
    const previousBodyOverflow = bodyStyle.overflow
    const previousBodyPosition = bodyStyle.position
    const previousBodyTop = bodyStyle.top
    const previousBodyLeft = bodyStyle.left
    const previousBodyRight = bodyStyle.right
    const previousBodyWidth = bodyStyle.width
    const previousBodyOverscrollBehavior = bodyStyle.overscrollBehavior

    htmlStyle.overflow = 'hidden'
    bodyStyle.overflow = 'hidden'
    bodyStyle.position = 'fixed'
    bodyStyle.top = `-${scrollY}px`
    bodyStyle.left = '0'
    bodyStyle.right = '0'
    bodyStyle.width = '100%'
    bodyStyle.overscrollBehavior = 'none'

    return () => {
      htmlStyle.overflow = previousHtmlOverflow
      bodyStyle.overflow = previousBodyOverflow
      bodyStyle.position = previousBodyPosition
      bodyStyle.top = previousBodyTop
      bodyStyle.left = previousBodyLeft
      bodyStyle.right = previousBodyRight
      bodyStyle.width = previousBodyWidth
      bodyStyle.overscrollBehavior = previousBodyOverscrollBehavior
      window.scrollTo(0, scrollY)
    }
  }, [standalonePWA])

  if (!standalonePWA) {
    return (
      <div className="min-h-dvh bg-[#101116] text-[#F5F7FA]">
        <div className="mx-auto flex min-h-dvh w-full sm:max-w-[900px] flex-col bg-[#101116]">
          <PublicHeader />

          <main className={`flex flex-1 flex-col justify-end px-5 py-12 sm:px-0 ${fullWidth ? '' : 'sm:items-center'}`}>
            <div className={`flex w-full ${fullWidth ? '' : 'sm:max-w-[600px]'} flex-col gap-8 rounded-[20px] bg-[#101116]`}>
              {title ? (
                <h1 className="text-[32px] font-normal leading-none text-[#F5F7FA]">
                  {title}
                </h1>
              ) : null}
              {children}
            </div>
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-x-0 top-0 h-app overflow-hidden bg-[#101116] text-[#F5F7FA]">
      <div className="mx-auto flex h-full w-full flex-col overflow-hidden sm:max-w-[900px]">
        <PublicHeader compact />

        <main className={`scrollbar-hide flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-5 pt-6 pb-[max(1.25rem,env(safe-area-inset-bottom,0px))] [-webkit-overflow-scrolling:touch] sm:px-0 sm:py-12 ${fullWidth ? '' : 'sm:items-center'}`}>
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
    </div>
  )
}
