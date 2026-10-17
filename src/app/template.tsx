// Re-mounts on every route change: a guaranteed, dependency-free fade between
// pages (cross-document loads get the ::view-transition crossfade instead).
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="kt-page-enter">{children}</div>;
}
