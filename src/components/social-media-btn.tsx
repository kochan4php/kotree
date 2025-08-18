'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { socialLinks } from '@/data/social-links';
import { LinkCounter, SocialLink } from '@/interfaces';
import { ExternalLink, Heart } from 'lucide-react';
import Link from 'next/link';

export default function SocialMediaBtn({ linkCounter }: { linkCounter: LinkCounter[] }) {
  const handleLinkClick = (link: SocialLink) => {
    const linkName = link.name.toLowerCase();
    fetch('/api/click-link-counter', {
      method: 'POST',
      body: JSON.stringify({
        name: linkName,
        count: linkName === socialLinks.find((link) => link.name.toLowerCase() === linkName)?.name.toLowerCase() && 1,
      }),
    });
  };

  return (
    <>
      <div className="space-y-4">
        {socialLinks.map((link: SocialLink, index) => {
          const findLinkCounter = linkCounter.find((item) => item.name === link.name.toLowerCase());

          return (
            <Card
              key={link.name}
              className="group bg-white/10 border-white/20 p-0 overflow-hidden hover:scale-105 transition-all duration-300 hover:shadow-2xl hover:shadow-purple-500/25"
              style={{
                animationDelay: `${index * 100}ms`,
              }}>
              <Link href={link.url} onClick={() => handleLinkClick(link)} target="_blank">
                <Button
                  className={`w-full h-16 bg-gradient-to-r ${link.color} text-white border-0 rounded-lg transition-all duration-300 group-hover:shadow-lg relative overflow-hidden animate-gradient`}>
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>

                  <div className="flex items-center justify-between w-full relative z-10">
                    <div className="flex items-center">
                      <link.icon className="w-6 h-6 mr-4" />
                      <div className="text-left">
                        <div className="font-semibold text-lg">{link.name}</div>
                        <div className="text-sm text-white/80">{link.description}</div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      {findLinkCounter?.count !== 0 && <Badge className="bg-white/20 text-white text-xs">{findLinkCounter?.count} clicks</Badge>}
                      <ExternalLink className="w-5 h-5 opacity-60 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                </Button>
              </Link>
            </Card>
          );
        })}
      </div>

      <Card className="bg-white/10 border-white/20 p-6 mt-8">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-white">{linkCounter.reduce((total, item) => total + item.count, 0)}</div>
            <div className="text-white/60 text-sm">Total Clicks</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-white">{socialLinks.length}</div>
            <div className="text-white/60 text-sm">Links</div>
          </div>
          <div className="flex items-center justify-center">
            <Heart className="w-6 h-6 text-red-400 animate-pulse" />
          </div>
        </div>
      </Card>
    </>
  );
}
