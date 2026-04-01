import { useEffect, type ReactNode } from 'react'
import PublicHeader from '../public/PublicHeader'

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
  useEffect(() => {
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
  }, [])

  return (
    <div className="fixed inset-0 flex h-app min-h-app flex-col overflow-hidden bg-[#101116] text-[#F5F7FA]">
      <div className="mx-auto w-full sm:max-w-[900px]">
        <PublicHeader compact />
      </div>

      <main className={`scrollbar-hide mx-auto flex min-h-0 flex-1 w-full flex-col justify-end overflow-y-auto overscroll-contain px-5 pt-6 pb-[max(1.25rem,env(safe-area-inset-bottom,0px))] [-webkit-overflow-scrolling:touch] sm:max-w-[900px] sm:px-0 sm:py-12 ${fullWidth ? '' : 'sm:items-center'}`}>
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
  )
}
