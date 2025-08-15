import { LucideProps } from 'lucide-react';
import { ForwardRefExoticComponent, RefAttributes } from 'react';

export interface SocialLink {
  name: string;
  url: string;
  icon: ForwardRefExoticComponent<Omit<LucideProps, 'ref'> & RefAttributes<SVGSVGElement>>;
  color: string;
  hoverColor: string;
  description: string;
}

export interface LinkCounter {
  name: string;
  count: number;
}
