import Background from '@/components/background';
import { Card } from '@/components/ui/card';

interface StateCardProps {
  children: React.ReactNode;
}

export default function StateCard({ children }: StateCardProps) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Background />
      <div className="relative z-10 w-full max-w-lg">
        <Card className="fluid-glass relative overflow-hidden p-8 text-center gap-0 border-accent/20 shadow-2xl">
          <div className="liquid-gradient opacity-20"></div>
          <div className="relative z-10">
            {children}
          </div>
        </Card>
      </div>
    </div>
  );
}
