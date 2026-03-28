import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  fullWidth?: boolean
}

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-accent text-text-inverse hover:bg-accent-hover active:bg-accent-pressed hover:shadow-lg hover:shadow-accent/20 focus-visible:ring-accent',
  secondary:
    'bg-surface-2 text-text-primary hover:bg-surface-3 focus-visible:ring-accent',
  danger:
    'bg-danger-subtle text-danger hover:bg-danger/25 focus-visible:ring-danger',
  ghost:
    'bg-transparent text-text-secondary hover:bg-surface-2 hover:text-text-primary focus-visible:ring-accent',
}

const sizeClasses: Record<Size, string> = {
  sm: 'h-10 px-4 text-body-sm',
  md: 'h-12 px-6 text-body',
  lg: 'h-14 px-8 text-body',
}

export default function Button({
  variant = 'primary',
  size = 'md',
  loading,
  fullWidth,
  disabled,
  children,
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-xl font-bold transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-0 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.97] ${variantClasses[variant]} ${sizeClasses[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent mr-2" />
      )}
      {children}
    </button>
  )
}
