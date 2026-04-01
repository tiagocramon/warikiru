import type { ReactNode } from 'react'
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
  return (
    <div className="flex h-app min-h-app flex-col overflow-hidden bg-[#101116] text-[#F5F7FA]">
      <div className="mx-auto w-full sm:max-w-[900px]">
        <PublicHeader compact />
      </div>

      <main className={`scrollbar-hide mx-auto flex flex-1 w-full flex-col overflow-y-auto overscroll-contain px-5 pt-6 pb-[max(3rem,env(safe-area-inset-bottom,0px))] [-webkit-overflow-scrolling:touch] sm:max-w-[900px] sm:px-0 sm:py-12 ${fullWidth ? '' : 'sm:items-center'}`}>
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
  )
}
