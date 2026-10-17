import { Card } from '@/components/ui/card';

interface StateCardProps {
  children: React.ReactNode;
}

export default function StateCard({ children }: StateCardProps) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="relative z-10 w-full max-w-lg md:max-w-xl">
        <Card className="fluid-glass relative overflow-hidden p-8 md:p-10 text-center gap-0">
          <div className="liquid-gradient opacity-20"></div>
          <div className="relative z-10">
            {children}
          </div>
        </Card>
      </div>
    </div>
  );
}
