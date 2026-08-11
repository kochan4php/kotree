import ProfileActions from '@/components/profile-actions';
import { Card } from '@/components/ui/card';
import { profile } from '@/data/profile';
import { Code2 } from 'lucide-react';
import Image from 'next/image';

export default function CardProfile() {
  return (
    <Card className="mb-6 text-center gap-3">
      <div className="relative w-fit mx-auto mb-4">
        <div className="absolute -inset-4 rounded-full bg-accent/15 blur-2xl"></div>
        <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-accent to-[#e05a47] p-[3px] shadow-lg shadow-accent/20">
          <Image src={profile.avatarUrl} alt={profile.name} className="rounded-full object-cover" priority width={96} height={96} />
        </div>
      </div>

      <h1 className="text-3xl font-bold tracking-tight text-foreground">{profile.name}</h1>
      <p className="text-base text-muted-foreground">{profile.handle}</p>

      <span className="inline-flex items-center justify-center gap-1 bg-accent/15 text-accent border border-accent/30 rounded-full px-3 py-1 text-base w-fit mx-auto">
        <Code2 className="w-4 h-4" />
        {profile.role}
      </span>

      <p className="text-foreground/90 max-w-sm mx-auto text-lg leading-snug">{profile.bio}</p>

      <div className="w-16 h-px bg-border/80 my-4 mx-auto"></div>

      <p className="text-foreground/90 text-lg italic leading-snug">
        &rdquo;{profile.quote} <span className="font-bold text-accent">{profile.quoteHighlight}</span>&rdquo;
      </p>

      <div className="mt-2">
        <ProfileActions />
      </div>
    </Card>
  );
}
