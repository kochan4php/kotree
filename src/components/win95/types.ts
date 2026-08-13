import type { ReactNode } from 'react';

export interface WindowState {
  id: string;
  title: string;
  content: ReactNode;
  x: number;
  y: number;
  width: number | string;
  height: number | string;
  zIndex: number;
  isMinimized: boolean;
  isMaximized: boolean;
  prevX: number;
  prevY: number;
  prevWidth: number | string;
  prevHeight: number | string;
}
