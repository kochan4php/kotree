import Skeleton from './skeleton';

// K40: route-level loading shell (loading.tsx). Reuses the skeleton shimmer so
// a slow navigation looks like the page arriving, not a white flash.
export default function PageLoading({ rows = 4 }: { rows?: number }) {
  return (
    <main
      id="main"
      tabIndex={-1}
      className="min-h-screen p-4 pt-[calc(4.75rem+env(safe-area-inset-top))] md:mt-2 focus:outline-none"
    >
      <div className="mx-auto max-w-2xl md:max-w-3xl pt-2">
        <Skeleton rows={rows} />
      </div>
    </main>
  );
}
