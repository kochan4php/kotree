function Skeleton({ className }: { className: string }) {
  return <div className={`bg-muted/40 animate-pulse rounded ${className}`} aria-hidden="true" />;
}

export default function LinksSkeleton() {
  return (
    <>
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="glass-card border rounded-2xl p-0 overflow-hidden">
            <div className="flex items-center gap-4 p-4">
              <Skeleton className="w-11 h-11 rounded-xl shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-40" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="glass-card border rounded-2xl p-6 mt-6">
        <div className="grid grid-cols-3 divide-x divide-border/60 text-center">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <Skeleton className="h-7 w-12" />
              <Skeleton className="h-3 w-16" />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
