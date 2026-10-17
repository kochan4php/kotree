import Link from 'next/link';

interface PageButtonProps {
  href?: string;
  onClick?: () => void;
  variant?: 'primary' | 'ghost';
  children: React.ReactNode;
}

const baseClass =
  'flex items-center justify-center gap-2 font-display py-3 px-6 rounded-xl border-[3px] border-foreground shadow-[4px_4px_0_0_var(--foreground)] transition-all duration-150 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_var(--foreground)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[2px_2px_0_0_var(--foreground)] cursor-pointer';

const variantClass = {
  primary: 'bg-accent text-accent-foreground',
  ghost: 'bg-card text-foreground',
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
