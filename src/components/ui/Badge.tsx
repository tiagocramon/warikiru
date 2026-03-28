import type { ReactNode } from 'react'

type BadgeVariant = 'success' | 'warning' | 'info' | 'accent' | 'danger'

interface BadgeProps {
  variant?: BadgeVariant
  children: ReactNode
}

const variantClasses: Record<BadgeVariant, string> = {
  success: 'bg-success-subtle text-success',
  warning: 'bg-warning-subtle text-warning',
  info: 'bg-info-subtle text-info',
  accent: 'bg-accent-subtle text-accent',
  danger: 'bg-danger-subtle text-danger',
}

export default function Badge({ variant = 'info', children }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-caption uppercase tracking-wider font-medium ${variantClasses[variant]}`}
    >
      {children}
    </span>
  )
}
