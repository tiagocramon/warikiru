interface SkeletonProps {
  className?: string
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div className={`bg-surface-2 rounded-lg animate-pulse ${className}`} />
  )
}

export function SkeletonCard() {
  return (
    <div className="bg-surface-1 rounded-xl p-5 space-y-3">
      <Skeleton className="h-5 w-2/3" />
      <Skeleton className="h-4 w-1/3" />
    </div>
  )
}

export function SkeletonExpense() {
  return (
    <div className="bg-surface-1 rounded-xl p-4 flex items-start gap-3">
      <Skeleton className="w-10 h-10 rounded-xl flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      <Skeleton className="h-5 w-16" />
    </div>
  )
}
