import Background from '@/components/background';

function Skeleton({ className }: { className: string }) {
  return <div className={`bg-muted/40 animate-pulse rounded ${className}`} aria-hidden="true" />;
}

export default function Loading() {
  return (
    <main className="min-h-screen p-4 md:mt-2">
      <Background />
      <div className="relative max-w-lg mx-auto">
        <div className="solid-card border rounded-xl p-6 mb-8 text-center flex flex-col gap-3">
          <div className="relative w-fit mx-auto mb-4">
            <div className="absolute -inset-4 rounded-full bg-accent/15 blur-2xl" />
            <Skeleton className="w-24 h-24 rounded-full" />
          </div>

          <Skeleton className="h-8 w-48 mx-auto" />
          <Skeleton className="h-4 w-24 mx-auto" />
          <Skeleton className="h-8 w-56 mx-auto rounded-full" />
          <Skeleton className="h-5 w-full max-w-sm mx-auto" />
          <div className="w-16 h-px bg-border/80 my-4 mx-auto" />
          <Skeleton className="h-5 w-72 mx-auto" />
          <Skeleton className="h-10 w-40 mx-auto rounded-xl mt-2" />
        </div>

        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="solid-card border rounded-xl p-0 overflow-hidden">
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

        <div className="solid-card border rounded-xl p-6 mt-6">
          <div className="grid grid-cols-3 divide-x divide-border/60 text-center">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <Skeleton className="h-7 w-12" />
                <Skeleton className="h-3 w-16" />
              </div>
            ))}
          </div>
        </div>

        <span className="sr-only">Loading...</span>
      </div>
    </main>
  );
}
