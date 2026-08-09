import Link from 'next/link';

interface PageButtonProps {
  href?: string;
  onClick?: () => void;
  variant?: 'primary' | 'ghost';
  children: React.ReactNode;
}

const baseClass =
  'flex items-center justify-center gap-2 font-semibold py-3 px-6 rounded-xl transition-all duration-300 active:scale-[0.98]';

const variantClass = {
  primary: 'bg-accent hover:bg-accent/90 text-accent-foreground',
  ghost: 'bg-muted/20 hover:bg-muted/40 text-foreground border border-border hover:border-accent/40',
} as const;

export default function PageButton({ href, onClick, variant = 'primary', children }: PageButtonProps) {
  const className = `${baseClass} ${variantClass[variant]}`;

  if (href) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={className}>
      {children}
    </button>
  );
}
