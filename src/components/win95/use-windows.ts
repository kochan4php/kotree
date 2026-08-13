'use client';

import { useCallback, useState } from 'react';
import { profileWindowContent, randomWindowPos } from './content';
import type { WindowState } from './types';

export function useWindows() {
  const [windows, setWindows] = useState<WindowState[]>([]);
  const [topZ, setTopZ] = useState(100);

  const openWindow = (
    id: string,
    title: string,
    content: React.ReactNode,
    x: number,
    y: number,
    width: number | string = 300,
    height: number | string = 'auto'
  ) => {
    if (windows.some(w => w.id === id)) {
      bringToFront(id);
      return;
    }
    const newZ = topZ + 1;
    setTopZ(newZ);
    setWindows([...windows, {
      id, title, content, x, y, width, height,
      zIndex: newZ, isMinimized: false, isMaximized: false,
      prevX: 0, prevY: 0, prevWidth: width, prevHeight: height,
    }]);
  };

  const closeWindow = (id: string) => setWindows(windows.filter(w => w.id !== id));

  const bringToFront = (id: string) => {
    const newZ = topZ + 1;
    setTopZ(newZ);
    setWindows(windows.map(w => (w.id === id ? { ...w, zIndex: newZ, isMinimized: false } : w)));
  };

  const toggleMinimize = (id: string) => {
    setWindows(windows.map(w => (w.id === id ? { ...w, isMinimized: !w.isMinimized } : w)));
  };

  const toggleMaximize = (id: string) => {
    setWindows(windows.map(w => {
      if (w.id !== id) return w;
      if (!w.isMaximized) {
        return {
          ...w,
          isMaximized: true,
          prevX: w.x,
          prevY: w.y,
          prevWidth: w.width,
          prevHeight: w.height,
          x: 0,
          y: 0,
          width: '100vw',
          height: 'calc(100vh - 32px)', // subtract taskbar height
        };
      }
      return {
        ...w,
        isMaximized: false,
        x: w.prevX,
        y: w.prevY,
        width: w.prevWidth,
        height: w.prevHeight,
      };
    }));
  };

  // Stable identity: called from the mount-time ACTIVATE_WIN95 listener
  const openProfileWindow = useCallback(() => {
    setTopZ(z => z + 1);
    setWindows(prev => {
      if (prev.some(w => w.id === 'profile')) return prev;
      const pos = randomWindowPos();
      return [...prev, {
        id: 'profile',
        title: 'Profile.exe',
        content: profileWindowContent,
        x: pos.x,
        y: pos.y,
        width: 320,
        height: 300,
        zIndex: prev.length === 0 ? 101 : prev[prev.length - 1].zIndex + 1,
        isMinimized: false,
        isMaximized: false,
        prevX: 0,
        prevY: 0,
        prevWidth: 320,
        prevHeight: 300,
      }];
    });
  }, []);

  return { windows, topZ, setWindows, openWindow, closeWindow, bringToFront, toggleMinimize, toggleMaximize, openProfileWindow };
}
