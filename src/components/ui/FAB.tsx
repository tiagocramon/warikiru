import { Plus } from 'lucide-react'

interface FABProps {
  onClick: () => void
}

export default function FAB({ onClick }: FABProps) {
  return (
    <button
      onClick={onClick}
      className="flex h-14 w-14 items-center justify-center rounded-full bg-accent text-text-inverse shadow-lg shadow-accent/30 transition-transform active:scale-90"
      aria-label="Novo"
    >
      <Plus size={24} />
    </button>
  )
}
