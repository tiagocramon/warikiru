import type { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  interactive?: boolean
  onClick?: () => void
}

export default function Card({ children, className = '', interactive, onClick }: CardProps) {
  const base = 'bg-surface-1 rounded-xl p-5 sm:p-6 transition-all duration-200'
  const interactiveStyles = interactive
    ? 'hover:bg-surface-2 cursor-pointer active:scale-[0.99]'
    : ''

  return (
    <div className={`${base} ${interactiveStyles} ${className}`} onClick={onClick}>
      {children}
    </div>
  )
}
