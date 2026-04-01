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
    <div className="flex min-h-app flex-col bg-[#101116] text-[#F5F7FA]">
      <div className="mx-auto w-full sm:max-w-[900px]">
        <PublicHeader />
      </div>

      <main className={`mx-auto flex flex-1 w-full flex-col px-5 pt-24 pb-[max(3rem,env(safe-area-inset-bottom,0px))] sm:max-w-[900px] sm:justify-end sm:px-0 sm:py-12 ${fullWidth ? '' : 'sm:items-center'}`}>
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
