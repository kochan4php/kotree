import Background from '@/components/background';

function Skeleton({ className }: { className: string }) {
  return <div className={`bg-muted/40 animate-pulse rounded ${className}`} aria-hidden="true" />;
}

export default function ChangelogLoading() {
  return (
    <main className="min-h-screen p-4 md:mt-12 relative z-10 w-full max-w-2xl mx-auto">
      <Background />
      <div className="relative w-full">
        {/* Header Skeleton */}
        <div className="flex items-center gap-4 mb-8">
          <Skeleton className="w-10 h-10 rounded-lg" />
          <Skeleton className="h-8 w-48 rounded" />
        </div>

        {/* Changelog Entries Skeleton */}
        <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border/80 before:to-transparent">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
              {/* Timeline Marker */}
              <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-background bg-muted/40 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow animate-pulse z-10" />
              
              {/* Card Skeleton */}
              <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] solid-card p-5 rounded-2xl border border-border/50 shadow-sm">
                <div className="flex flex-col gap-2 mb-3">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-5 w-24 rounded-full" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                  <Skeleton className="h-6 w-3/4" />
                </div>
                <div className="space-y-2 mt-4">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                  <Skeleton className="h-4 w-4/5" />
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <span className="sr-only">Loading changelog...</span>
      </div>
    </main>
  );
}
