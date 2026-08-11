'use client';

import { useEffect, useState, useRef } from 'react';
import { X, Minus, Square } from 'lucide-react';
import { profile } from '@/data/profile';
import { socialLinks } from '@/data/social-links';
import React from 'react';

interface WindowState {
  id: string;
  title: string;
  content: React.ReactNode;
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

export default function Win95Mode() {
  const [isActive, setIsActive] = useState(false);
  const [windows, setWindows] = useState<WindowState[]>([]);
  const [topZ, setTopZ] = useState(100);

  // Dragging state
  const draggingId = useRef<string | null>(null);
  const dragOffset = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handleActivate = () => {
      setIsActive(true);
      if (windows.length === 0) {
        openWindow('profile', 'Profile.exe', (
          <div className="flex flex-col items-center gap-4 p-4 text-black">
            <img src={profile.avatarUrl} alt="Avatar" className="w-24 h-24 border-2 border-gray-500 shadow-[inset_1px_1px_0px_white,inset_-1px_-1px_0px_#888]" style={{ imageRendering: 'pixelated' }} />
            <h2 className="font-bold text-xl">{profile.name}</h2>
            <p className="text-center">{profile.bio}</p>
          </div>
        ), 320, 300);
      }
    };

    window.addEventListener('ACTIVATE_WIN95', handleActivate);
    return () => window.removeEventListener('ACTIVATE_WIN95', handleActivate);
  }, [windows.length]);

  // Handle global mouse move for dragging
  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (!draggingId.current) return;
      
      setWindows(prev => prev.map(w => {
        if (w.id === draggingId.current && !w.isMaximized) {
          return {
            ...w,
            x: e.clientX - dragOffset.current.x,
            y: e.clientY - dragOffset.current.y
          };
        }
        return w;
      }));
    };

    const handlePointerUp = () => {
      draggingId.current = null;
    };

    if (isActive) {
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
    }
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isActive]);

  const openWindow = (id: string, title: string, content: React.ReactNode, width: number | string = 300, height: number | string = 'auto') => {
    if (windows.find(w => w.id === id)) {
      bringToFront(id);
      return;
    }
    const newZ = topZ + 1;
    setTopZ(newZ);
    setWindows([...windows, { 
      id, title, content, 
      x: Math.random() * 50 + 50, 
      y: Math.random() * 50 + 50,
      width, height,
      zIndex: newZ,
      isMinimized: false,
      isMaximized: false,
      prevX: 0, prevY: 0, prevWidth: width, prevHeight: height
    }]);
  };

  const closeWindow = (id: string) => {
    setWindows(windows.filter(w => w.id !== id));
  };

  const bringToFront = (id: string) => {
    const newZ = topZ + 1;
    setTopZ(newZ);
    setWindows(windows.map(w => {
      if (w.id === id) {
        return { ...w, zIndex: newZ, isMinimized: false };
      }
      return w;
    }));
  };

  const toggleMinimize = (id: string) => {
    setWindows(windows.map(w => w.id === id ? { ...w, isMinimized: !w.isMinimized } : w));
  };

  const toggleMaximize = (id: string) => {
    setWindows(windows.map(w => {
      if (w.id === id) {
        if (!w.isMaximized) {
          // Maximize
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
            height: 'calc(100vh - 32px)' // subtract taskbar height
          };
        } else {
          // Restore
          return {
            ...w,
            isMaximized: false,
            x: w.prevX,
            y: w.prevY,
            width: w.prevWidth,
            height: w.prevHeight
          };
        }
      }
      return w;
    }));
  };

  const handlePointerDown = (e: React.PointerEvent, id: string, w: WindowState) => {
    bringToFront(id);
    if (!w.isMaximized) {
      draggingId.current = id;
      dragOffset.current = {
        x: e.clientX - w.x,
        y: e.clientY - w.y
      };
    }
  };

  if (!isActive) return null;

  return (
    <div className="fixed inset-0 z-[9000] bg-[#008080] font-[System] text-sm overflow-hidden pointer-events-auto selection:bg-[#000080] selection:text-white" style={{ fontFamily: '"MS Sans Serif", Tahoma, sans-serif' }}>
      
      {/* Desktop Icons */}
      <div className="flex flex-col gap-6 p-4 items-start">
        <button onDoubleClick={() => openWindow('profile', 'Profile.exe', (
          <div className="flex flex-col items-center gap-4 p-4 text-black">
            <img src={profile.avatarUrl} alt="Avatar" className="w-24 h-24 border-2 border-gray-500 shadow-[inset_1px_1px_0px_white,inset_-1px_-1px_0px_#888]" style={{ imageRendering: 'pixelated' }} />
            <h2 className="font-bold text-xl">{profile.name}</h2>
            <p className="text-center">{profile.bio}</p>
          </div>
        ), 320, 300)} className="flex flex-col items-center gap-1 group w-20 text-white">
          <div className="w-10 h-10 bg-[url('https://win98icons.alexmeub.com/icons/png/user_computer-0.png')] bg-contain bg-no-repeat" />
          <span className="bg-transparent group-focus:bg-[#000080] group-focus:text-white group-focus:border-dotted group-focus:border px-1 text-center">My Profile</span>
        </button>
        
        <button onDoubleClick={() => openWindow('links', 'Links.folder', (
          <div className="grid grid-cols-3 gap-6 p-4 bg-white min-h-[300px] w-full text-black items-start content-start">
            {socialLinks.map(link => {
              const Icon = link.icon;
              return (
                <a key={link.name} href={link.url} target="_blank" rel="noreferrer" className="flex flex-col items-center gap-2 text-black hover:bg-[#000080] hover:text-white p-2">
                  <div className="w-10 h-10 flex items-center justify-center border border-transparent hover:border-white">
                    <Icon className="w-8 h-8" />
                  </div>
                  <span className="text-xs text-center leading-tight">{link.name}</span>
                </a>
              );
            })}
          </div>
        ), 400, 350)} className="flex flex-col items-center gap-1 group w-20 text-white">
          <div className="w-10 h-10 bg-[url('https://win98icons.alexmeub.com/icons/png/directory_open_file_mydocs-4.png')] bg-contain bg-no-repeat" />
          <span className="bg-transparent group-focus:bg-[#000080] group-focus:text-white group-focus:border-dotted group-focus:border px-1 text-center">My Links</span>
        </button>

        <button onClick={() => setIsActive(false)} className="flex flex-col items-center gap-1 group w-20 text-white">
          <div className="w-10 h-10 bg-[url('https://win98icons.alexmeub.com/icons/png/shut_down_normal-0.png')] bg-contain bg-no-repeat" />
          <span className="bg-transparent group-focus:bg-[#000080] group-focus:text-white group-focus:border-dotted group-focus:border px-1 text-center">Exit Win95</span>
        </button>
      </div>

      {/* Windows */}
      {windows.map(w => {
        if (w.isMinimized) return null;
        
        return (
          <div key={w.id} 
               onClick={() => bringToFront(w.id)}
               className={`absolute bg-[#c0c0c0] border-2 border-white border-b-black border-r-black shadow-[2px_2px_0px_#000] flex flex-col ${w.isMaximized ? 'transition-all duration-200' : ''}`}
               style={{ left: w.x, top: w.y, zIndex: w.zIndex, width: w.width, height: w.height }}>
            {/* Title Bar */}
            <div 
              onPointerDown={(e) => handlePointerDown(e, w.id, w)}
              onDoubleClick={() => toggleMaximize(w.id)}
              className="bg-[#000080] text-white font-bold p-1 m-0.5 flex justify-between items-center cursor-default select-none touch-none">
              <span className="pl-1 truncate">{w.title}</span>
              <div className="flex gap-0.5 pointer-events-auto">
                <button 
                  onClick={(e) => { e.stopPropagation(); toggleMinimize(w.id); }} 
                  className="w-4 h-4 bg-[#c0c0c0] border-2 border-white border-b-black border-r-black flex items-center justify-center text-black active:border-black active:border-b-white active:border-r-white font-bold">
                  <Minus size={10} strokeWidth={4} />
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); toggleMaximize(w.id); }} 
                  className="w-4 h-4 bg-[#c0c0c0] border-2 border-white border-b-black border-r-black flex items-center justify-center text-black active:border-black active:border-b-white active:border-r-white font-bold">
                  {w.isMaximized ? <div className="w-2 h-2 border-[1.5px] border-black relative"><div className="w-2 h-2 border-[1.5px] border-black absolute -top-1 -right-1 bg-[#c0c0c0]"></div></div> : <Square size={10} strokeWidth={3} />}
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); closeWindow(w.id); }} 
                  className="w-4 h-4 bg-[#c0c0c0] border-2 border-white border-b-black border-r-black flex items-center justify-center text-black active:border-black active:border-b-white active:border-r-white ml-0.5 font-bold">
                  <X size={12} strokeWidth={4} />
                </button>
              </div>
            </div>
            {/* Content Area */}
            <div className="border-t-[#808080] border-l-[#808080] border-b-white border-r-white border m-0.5 flex-1 overflow-auto bg-white">
              {w.content}
            </div>
          </div>
        );
      })}

      {/* Taskbar */}
      <div className="fixed bottom-0 left-0 right-0 h-8 bg-[#c0c0c0] border-t-2 border-white flex items-center px-1 z-[9999] justify-between">
        <div className="flex items-center gap-1">
          <button className="h-6 px-2 flex items-center gap-1 bg-[#c0c0c0] border-2 border-white border-b-black border-r-black font-bold active:border-black active:border-b-white active:border-r-white text-black shadow-[1px_1px_0px_#000]">
            <img src="https://win98icons.alexmeub.com/icons/png/windows_slanted-1.png" className="w-4 h-4" alt="Start" />
            Start
          </button>
          <div className="flex-1 px-2 flex gap-1 items-center">
            {windows.map(w => (
              <button key={w.id} onClick={() => bringToFront(w.id)} className={`h-6 px-2 truncate min-w-[100px] max-w-[150px] text-left text-black font-bold flex items-center gap-1 shadow-[1px_1px_0px_#000] ${w.zIndex === topZ && !w.isMinimized ? 'border-2 border-black border-b-white border-r-white bg-[#e0e0e0]' : 'border-2 border-white border-b-black border-r-black bg-[#c0c0c0]'}`}>
                <div className={`w-4 h-4 bg-contain bg-no-repeat ${w.id === 'links' ? "bg-[url('https://win98icons.alexmeub.com/icons/png/directory_open_file_mydocs-4.png')]" : "bg-[url('https://win98icons.alexmeub.com/icons/png/user_computer-0.png')]"}`} />
                {w.title}
              </button>
            ))}
          </div>
        </div>
        <div className="h-6 px-2 flex items-center bg-[#c0c0c0] border-2 border-b-white border-r-white border-t-black border-l-black text-black shadow-[1px_1px_0px_#fff]">
          {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
        </div>
      </div>

    </div>
  );
}
