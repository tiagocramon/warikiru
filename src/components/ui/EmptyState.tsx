import type { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  message: string
  icon?: LucideIcon
  action?: {
    label: string
    onClick: () => void
  }
}

export default function EmptyState({ message, icon: Icon, action }: EmptyStateProps) {
  return (
    <div className="text-center py-16">
      {Icon && (
        <div className="flex justify-center mb-4">
          <Icon size={48} className="text-text-disabled" strokeWidth={1.5} />
        </div>
      )}
      <p className="text-body text-text-secondary">{message}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="mt-3 text-body text-accent hover:text-accent-hover font-medium transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
