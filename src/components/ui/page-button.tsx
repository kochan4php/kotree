import Link from 'next/link';

interface PageButtonProps {
  href?: string;
  onClick?: () => void;
  variant?: 'primary' | 'ghost';
  children: React.ReactNode;
}

const baseClass =
  'flex items-center justify-center gap-2 font-bold py-3 px-6 rounded-xl transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer';

const variantClass = {
  primary: 'bg-accent hover:bg-accent/90 text-accent-foreground shadow-md',
  ghost: 'fluid-glass bg-white/5! hover:bg-white/10! text-foreground border-white/10! hover:border-accent/40! shadow-sm',
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
