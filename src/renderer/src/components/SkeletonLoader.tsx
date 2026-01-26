export function SkeletonLoader({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-neutral-200 dark:bg-neutral-800 rounded ${className}`} />
}

export function SidebarSkeleton() {
  return (
    <div className="w-72 h-full flex flex-col p-4 space-y-6">
      <div className="flex items-center space-x-3">
        <SkeletonLoader className="w-8 h-8 rounded-xl" />
        <div className="flex-1 space-y-2">
          <SkeletonLoader className="h-4 w-24" />
          <SkeletonLoader className="h-3 w-16" />
        </div>
      </div>

      <div className="space-y-4">
        <SkeletonLoader className="h-8 w-full rounded-lg" />
        <div className="space-y-2">
          <SkeletonLoader className="h-8 w-full rounded-lg" />
          <SkeletonLoader className="h-8 w-full rounded-lg" />
          <SkeletonLoader className="h-8 w-full rounded-lg" />
        </div>
      </div>
    </div>
  )
}
