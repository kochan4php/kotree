// K39: shared loading placeholder. The shimmer lives in animations.css and the
// global reduced-motion gate turns it into a flat block.
interface SkeletonProps {
  rows?: number;
  /** Extra classes for the wrapper (spacing, width). */
  className?: string;
}

export default function Skeleton({ rows = 3, className = '' }: SkeletonProps) {
  return (
    <div data-skeleton role="status" className={`space-y-2 ${className}`}>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} aria-hidden="true" className="kt-skeleton h-9 rounded-lg border-2 border-foreground/25" />
      ))}
      <span className="sr-only">Loading…</span>
    </div>
  );
}
