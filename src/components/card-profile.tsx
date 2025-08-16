import CopyProfileButton from '@/components/copy-button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Code2 } from 'lucide-react';
import Image from 'next/image';

export default function CardProfile() {
  return (
    <Card className="bg-white/10 border-white/20 p-8 mb-8 text-center">
      <div className="relative">
        <div className="w-32 h-32 mx-auto rounded-full bg-gradient-to-br from-blue-400 to-purple-600 p-1">
          <Image src="https://avatars.githubusercontent.com/kochan4php" alt="Deo Subarno" className="rounded-full object-cover" priority width={120} height={120} />
        </div>
      </div>

      <div className="relative flex flex-col items-center">
        <span className="text-3xl font-bold text-white">Deo Subarno</span>
        <span className="absolute top-1/2 -translate-y-1/2 text-base font-bold text-white">a.k.a</span>
        <span className="text-3xl font-bold text-white mt-8">Kochan</span>
      </div>

      <Badge className="bg-gradient-to-r from-blue-500 via-purple-600 to-pink-500 text-white border-0 mb-4 animate-gradient-slow text-sm md:text-base mx-auto">
        <Code2 className="w-4 h-4 mr-2" />
        Software and Game Developer
      </Badge>

      <p className="text-white mb-3 text-base leading-loose">Passionate about building scalable systems and web applications. Let&rsquo;s connect and create something amazing together! 🚀</p>

      <p className="text-white font-semibold base text-center italic mb-6">
        &rdquo;Pria sigma itu waifunya <span className="font-bold animate-pulse">Madoka Yuzuhara</span>&rdquo;
      </p>

      <CopyProfileButton />
    </Card>
  );
}
