'use client';

import { useEffect, useState } from 'react';
import { X, Minus, Square } from 'lucide-react';
import { profile } from '@/data/profile';
import { socialLinks } from '@/data/social-links';

export default function Win95Mode() {
  const [isActive, setIsActive] = useState(false);
  const [windows, setWindows] = useState<{id: string, title: string, content: React.ReactNode, x: number, y: number, zIndex: number}[]>([]);
  const [topZ, setTopZ] = useState(100);

  useEffect(() => {
    const handleActivate = () => {
      setIsActive(true);
      // Open initial window
      openWindow('profile', 'Profile.exe', (
        <div className="flex flex-col items-center gap-4 p-4 text-black">
          <img src={profile.avatarUrl} alt="Avatar" className="w-24 h-24 border-2 border-gray-400" style={{ imageRendering: 'pixelated' }} />
          <h2 className="font-bold text-xl">{profile.name}</h2>
          <p>{profile.bio}</p>
        </div>
      ));
    };

    window.addEventListener('ACTIVATE_WIN95', handleActivate);
    return () => window.removeEventListener('ACTIVATE_WIN95', handleActivate);
  }, []);

  const openWindow = (id: string, title: string, content: React.ReactNode) => {
    if (windows.find(w => w.id === id)) {
      bringToFront(id);
      return;
    }
    const newZ = topZ + 1;
    setTopZ(newZ);
    setWindows([...windows, { 
      id, title, content, 
      x: Math.random() * 100 + 50, 
      y: Math.random() * 100 + 50,
      zIndex: newZ
    }]);
  };

  const closeWindow = (id: string) => {
    setWindows(windows.filter(w => w.id !== id));
  };

  const bringToFront = (id: string) => {
    const newZ = topZ + 1;
    setTopZ(newZ);
    setWindows(windows.map(w => w.id === id ? { ...w, zIndex: newZ } : w));
  };

  if (!isActive) return null;

  return (
    <div className="fixed inset-0 z-[9000] bg-[#008080] font-[System] text-sm overflow-hidden pointer-events-auto selection:bg-[#000080] selection:text-white" style={{ fontFamily: '"MS Sans Serif", Tahoma, sans-serif' }}>
      
      {/* Desktop Icons */}
      <div className="flex flex-col gap-6 p-4 items-start">
        <button onDoubleClick={() => openWindow('profile', 'Profile.exe', (
          <div className="flex flex-col items-center gap-4 p-4 text-black">
            <img src={profile.avatarUrl} alt="Avatar" className="w-24 h-24 border-2 border-gray-500 shadow-[inset_1px_1px_0px_white,inset_-1px_-1px_0px_#888]" />
            <h2 className="font-bold text-xl">{profile.name}</h2>
            <p>{profile.bio}</p>
          </div>
        ))} className="flex flex-col items-center gap-1 group w-20 text-white">
          <div className="w-8 h-8 bg-[url('https://win98icons.alexmeub.com/icons/png/user_computer-0.png')] bg-contain bg-no-repeat" />
          <span className="bg-transparent group-focus:bg-[#000080] group-focus:text-white group-focus:border-dotted group-focus:border px-1 text-center">My Profile</span>
        </button>
        
        <button onDoubleClick={() => openWindow('links', 'Links.folder', (
          <div className="grid grid-cols-3 gap-4 p-4 bg-white min-h-[200px] w-full text-black">
            {socialLinks.map(link => (
              <a key={link.name} href={link.url} target="_blank" rel="noreferrer" className="flex flex-col items-center gap-1 text-black hover:bg-[#000080] hover:text-white p-2">
                <div className="w-8 h-8 bg-[url('https://win98icons.alexmeub.com/icons/png/html_doc-0.png')] bg-contain bg-no-repeat" />
                <span className="text-xs text-center">{link.name}</span>
              </a>
            ))}
          </div>
        ))} className="flex flex-col items-center gap-1 group w-20 text-white">
          <div className="w-8 h-8 bg-[url('https://win98icons.alexmeub.com/icons/png/directory_open_file_mydocs-4.png')] bg-contain bg-no-repeat" />
          <span className="bg-transparent group-focus:bg-[#000080] group-focus:text-white group-focus:border-dotted group-focus:border px-1 text-center">My Links</span>
        </button>

        <button onClick={() => setIsActive(false)} className="flex flex-col items-center gap-1 group w-20 text-white">
          <div className="w-8 h-8 bg-[url('https://win98icons.alexmeub.com/icons/png/shut_down_normal-0.png')] bg-contain bg-no-repeat" />
          <span className="bg-transparent group-focus:bg-[#000080] group-focus:text-white group-focus:border-dotted group-focus:border px-1 text-center">Exit Win95</span>
        </button>
      </div>

      {/* Windows */}
      {windows.map(w => (
        <div key={w.id} 
             onClick={() => bringToFront(w.id)}
             className="absolute bg-[#c0c0c0] border-2 border-white border-b-black border-r-black shadow-lg min-w-[300px]"
             style={{ left: w.x, top: w.y, zIndex: w.zIndex }}>
          {/* Title Bar */}
          <div className="bg-[#000080] text-white font-bold p-1 flex justify-between items-center cursor-default">
            <span className="pl-1 truncate select-none">{w.title}</span>
            <div className="flex gap-0.5">
              <button className="w-4 h-4 bg-[#c0c0c0] border-2 border-white border-b-black border-r-black flex items-center justify-center text-black active:border-black active:border-b-white active:border-r-white">
                <Minus size={10} />
              </button>
              <button className="w-4 h-4 bg-[#c0c0c0] border-2 border-white border-b-black border-r-black flex items-center justify-center text-black active:border-black active:border-b-white active:border-r-white">
                <Square size={10} />
              </button>
              <button onClick={(e) => { e.stopPropagation(); closeWindow(w.id); }} className="w-4 h-4 bg-[#c0c0c0] border-2 border-white border-b-black border-r-black flex items-center justify-center text-black active:border-black active:border-b-white active:border-r-white ml-0.5 font-bold">
                <X size={12} />
              </button>
            </div>
          </div>
          {/* Content */}
          <div className="border-t-[#dfdfdf] border-l-[#dfdfdf] border-b-[#808080] border-r-[#808080] border m-1">
            {w.content}
          </div>
        </div>
      ))}

      {/* Taskbar */}
      <div className="fixed bottom-0 left-0 right-0 h-8 bg-[#c0c0c0] border-t-2 border-white flex items-center px-1 z-[9999]">
        <button className="h-6 px-2 flex items-center gap-1 bg-[#c0c0c0] border-2 border-white border-b-black border-r-black font-bold active:border-black active:border-b-white active:border-r-white text-black">
          <img src="https://win98icons.alexmeub.com/icons/png/windows_slanted-1.png" className="w-4 h-4" alt="Start" />
          Start
        </button>
        <div className="flex-1 px-2 flex gap-1">
          {windows.map(w => (
            <button key={w.id} onClick={() => bringToFront(w.id)} className={`h-6 px-2 truncate min-w-[100px] max-w-[150px] text-left text-black font-bold ${w.zIndex === topZ ? 'border-2 border-black border-b-white border-r-white bg-[#e0e0e0]' : 'border-2 border-white border-b-black border-r-black bg-[#c0c0c0]'}`}>
              {w.title}
            </button>
          ))}
        </div>
        <div className="h-6 px-2 flex items-center bg-[#c0c0c0] border-2 border-b-white border-r-white border-t-black border-l-black text-black">
          {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
        </div>
      </div>

    </div>
  );
}
