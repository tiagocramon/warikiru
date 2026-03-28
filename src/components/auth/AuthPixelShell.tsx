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
    <div className="min-h-screen bg-[#101116] text-[#F5F7FA]">
      <div className="mx-auto flex min-h-screen w-full sm:max-w-[900px] flex-col bg-[#101116]">
        <PublicHeader />

        <main className={`flex flex-1 flex-col justify-end px-5 sm:px-0 py-12 ${fullWidth ? '' : 'sm:items-center'}`}>
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
