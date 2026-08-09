import { ComponentType } from 'react';

export interface SocialLink {
  name: string;
  url: string;
  icon: ComponentType<{ className?: string }>;
  color: string;
  description: string;
}

export interface LinkCounter {
  name: string;
  count: number;
}
