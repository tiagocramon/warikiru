import { useEffect } from 'react'

interface SpinnerProps {
  fullScreen?: boolean
}

export default function Spinner({ fullScreen }: SpinnerProps) {
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  const spinner = (
    <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#F5C249] border-t-transparent" />
  )

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#101116]">
        {spinner}
      </div>
    )
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-[#101116]">
      {spinner}
    </div>
  )
}
