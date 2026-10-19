// K39: shared loading placeholder. The shimmer lives in animations.css and the
// global reduced-motion gate turns it into a flat block.
interface SkeletonProps {
  rows?: number;
  /** Extra classes for the wrapper (spacing, width). */
  className?: string;
}

// Uneven line lengths read as text arriving; equal bars read as five pills.
const WIDTHS = ['w-full', 'w-[92%]', 'w-[97%]', 'w-[70%]', 'w-[88%]', 'w-[60%]'];

export default function Skeleton({ rows = 3, className = '' }: SkeletonProps) {
  return (
    <div data-skeleton role="status" className={`space-y-2.5 ${className}`}>
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          aria-hidden="true"
          className={`kt-skeleton h-3.5 rounded ${WIDTHS[i % WIDTHS.length]}`}
        />
      ))}
      <span className="sr-only">Loading…</span>
    </div>
  );
}
