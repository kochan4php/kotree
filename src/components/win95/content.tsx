import { profile } from '@/data/profile';
import { socialLinks } from '@/data/social-links';

export const profileWindowContent = (
  <div className="flex flex-col items-center gap-4 p-4 text-black">
    {/* eslint-disable-next-line @next/next/no-img-element -- pixel-art easter egg, next/image irrelevant */}
    <img
      src={profile.avatarUrl}
      alt="Avatar"
      className="w-24 h-24 border-2 border-gray-500 shadow-[inset_1px_1px_0px_white,inset_-1px_-1px_0px_#888]"
      style={{ imageRendering: 'pixelated' }}
    />
    <h2 className="font-bold text-xl">{profile.name}</h2>
    <p className="text-center">{profile.bio}</p>
  </div>
);

export const linksWindowContent = (
  <div className="grid grid-cols-3 gap-6 p-4 bg-white min-h-[300px] w-full text-black items-start content-start">
    {socialLinks.map(link => {
      const Icon = link.icon;
      return (
        <a
          key={link.name}
          href={link.url}
          target="_blank"
          rel="noreferrer"
          className="flex flex-col items-center gap-2 text-black hover:bg-[#000080] hover:text-white p-2"
        >
          <div className="w-10 h-10 flex items-center justify-center border border-transparent hover:border-white">
            <Icon className="w-8 h-8" />
          </div>
          <span className="text-xs text-center leading-tight">{link.name}</span>
        </a>
      );
    })}
  </div>
);

// Module scope so Math.random never runs in render-phase code
export const randomWindowPos = () => ({ x: 50 + Math.random() * 50, y: 50 + Math.random() * 50 });
