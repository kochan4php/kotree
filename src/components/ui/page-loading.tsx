import { Card } from './card';

// K40: route-level loading shell (loading.tsx). Shaped like a page — a header
// card with a title, prose and two chips, then content cards — so a slow
// navigation looks like the page arriving, not five identical grey pills.
const BODY_LINES = ['w-full', 'w-[95%]', 'w-[88%]', 'w-[62%]'];

export default function PageLoading() {
  return (
    <main
      id="main"
      tabIndex={-1}
      className="min-h-screen p-4 pt-[calc(4.75rem+env(safe-area-inset-top))] md:mt-2 focus:outline-none"
    >
      <div data-skeleton role="status" className="mx-auto w-full max-w-2xl space-y-3 pt-2 md:max-w-3xl">
        <Card className="fluid-glass">
          <div aria-hidden="true">
            <div className="kt-skeleton h-8 w-40 rounded-md" />
            <div className="mt-4 space-y-2.5">
              <div className="kt-skeleton h-3.5 w-full rounded" />
              <div className="kt-skeleton h-3.5 w-2/3 rounded" />
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <div className="kt-skeleton h-8 w-28 rounded-lg" />
              <div className="kt-skeleton h-8 w-24 rounded-lg" />
            </div>
          </div>
        </Card>

        {[0, 1].map((i) => (
          <Card key={i} className="fluid-glass">
            <div aria-hidden="true">
              <div className="flex items-center justify-between gap-3">
                <div className="kt-skeleton h-6 w-28 rounded-md" />
                <div className="kt-skeleton h-8 w-24 rounded-lg" />
              </div>
              <div className="mt-5 space-y-2.5">
                {BODY_LINES.map((width) => (
                  <div key={width} className={`kt-skeleton h-3.5 rounded ${width}`} />
                ))}
              </div>
            </div>
          </Card>
        ))}

        <span className="sr-only">Loading…</span>
      </div>
    </main>
  );
}
