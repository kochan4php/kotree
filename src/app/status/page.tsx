import { getVitalsP75, pingDb, type VitalAggregate } from '@/connections/mongodb';
import StatusClient from '@/components/status/status-client';
import { Card } from '@/components/ui/card';
import { Activity, Database, Gauge, GitCommitHorizontal } from 'lucide-react';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Status',
  description: 'Live status of Kotree — database, app version and offline support.',
  robots: { index: false, follow: false },
};

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b-2 border-dashed border-foreground/20 py-2 last:border-0">
      <dt className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="text-sm font-bold text-foreground">{children}</dd>
    </div>
  );
}

async function checkMongo() {
  const started = Date.now();
  const ok = await pingDb();
  return { ok, ms: Date.now() - started };
}

const RATING_STYLES: Record<VitalAggregate['rating'], string> = {
  good: 'bg-green-300',
  ni: 'bg-amber-300',
  poor: 'bg-red-300',
};

const RATING_LABELS: Record<VitalAggregate['rating'], string> = {
  good: 'Good',
  ni: 'Needs work',
  poor: 'Poor',
};

const METRIC_ORDER = ['LCP', 'INP', 'CLS', 'FCP', 'TTFB'];

export default async function StatusPage() {
  const { ok: mongo, ms: mongoMs } = await checkMongo();
  const version = process.env.APP_VERSION ?? 'dev';
  const commit = process.env.COMMIT_REF ? process.env.COMMIT_REF.slice(0, 7) : null;

  // Real-user timings the browser beacons send to /api/vitals. A p75 cannot be
  // averaged across pages, so each metric shows the page with the most samples
  // — the honest number, labelled with where it came from.
  const vitals = await getVitalsP75(7).catch(() => [] as VitalAggregate[]);
  const busiestPerMetric = new Map<string, VitalAggregate>();
  for (const vital of vitals) {
    const current = busiestPerMetric.get(vital.metric);
    if (!current || vital.total > current.total) busiestPerMetric.set(vital.metric, vital);
  }
  const vitalRows = [...busiestPerMetric.values()].sort(
    (a, b) => METRIC_ORDER.indexOf(a.metric) - METRIC_ORDER.indexOf(b.metric)
  );

  return (
    <main
      id="main"
      tabIndex={-1}
      className="min-h-screen p-4 pt-[calc(4.75rem+env(safe-area-inset-top))] md:mt-2 focus:outline-none"
    >
      <div className="relative mx-auto w-full max-w-2xl">
        <Card className="fluid-glass">
          <div className="liquid-gradient"></div>
          <div className="relative z-10">
            <h1 className="font-display text-2xl font-black uppercase tracking-tight text-foreground md:text-3xl">
              System Status
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Live checks straight from the running app — no external monitoring involved.
            </p>

            <div className="mt-6 flex flex-col gap-5">
              <section aria-labelledby="status-server">
                <h2
                  id="status-server"
                  className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-wider text-foreground"
                >
                  <Activity className="h-4 w-4 text-accent-ink" aria-hidden="true" />
                  Server
                </h2>
                <dl className="rounded-lg border-[3px] border-foreground bg-background/80 px-4 py-1 shadow-[4px_4px_0_0_var(--foreground)]">
                  <Row label="Database">
                    <span className="inline-flex items-center gap-1.5">
                      <Database className="h-3.5 w-3.5" aria-hidden="true" />
                      <span
                        className={`inline-block rounded border-2 border-foreground px-1.5 text-[11px] font-black uppercase text-[#14110f] ${
                          mongo ? 'bg-green-300' : 'bg-red-300'
                        }`}
                      >
                        {mongo ? 'Online' : 'Degraded'}
                      </span>
                      <span className="text-xs font-mono text-muted-foreground">{mongoMs} ms</span>
                    </span>
                  </Row>
                  <Row label="App version">
                    <span className="font-mono text-xs">v{version}</span>
                  </Row>
                  {commit && (
                    <Row label="Build">
                      <span className="inline-flex items-center gap-1 font-mono text-xs">
                        <GitCommitHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
                        {commit}
                      </span>
                    </Row>
                  )}
                </dl>
              </section>

              {vitalRows.length > 0 && (
                <section aria-labelledby="status-vitals">
                  <h2
                    id="status-vitals"
                    className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-wider text-foreground"
                  >
                    <Gauge className="h-4 w-4 text-accent-ink" aria-hidden="true" />
                    Real-user timings (p75, last 7 days)
                  </h2>
                  <dl className="rounded-lg border-[3px] border-foreground bg-background/80 px-4 py-1 shadow-[4px_4px_0_0_var(--foreground)]">
                    {vitalRows.map((vital) => (
                      <Row key={vital.metric} label={vital.metric}>
                        <span className="inline-flex items-center gap-1.5">
                          <span
                            className={`inline-block rounded border-2 border-foreground px-1.5 text-[11px] font-black uppercase text-[#14110f] ${RATING_STYLES[vital.rating]}`}
                          >
                            {RATING_LABELS[vital.rating]}
                          </span>
                          <span className="font-mono text-xs">
                            {vital.metric === 'CLS' ? vital.p75.toFixed(3) : `${vital.p75} ms`}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            {vital.page} · {vital.total} samples
                          </span>
                        </span>
                      </Row>
                    ))}
                  </dl>
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    Anonymous timings reported by visitors&apos; browsers, measured in the field.
                  </p>
                </section>
              )}

              <StatusClient />
            </div>
          </div>
        </Card>
      </div>
    </main>
  );
}
