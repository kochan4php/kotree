'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LinkCounter, SocialLink } from '@/interfaces';
import { Briefcase, Code2, ExternalLink, Github, Gitlab, Globe, Heart, Instagram, Linkedin, MessageCircle } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

const socialLinks: SocialLink[] = [
  {
    name: 'Gravatar',
    url: 'https://gravatar.com/kochan4php',
    icon: Globe,
    color: 'from-blue-500 to-blue-600',
    hoverColor: 'hover:from-blue-600 hover:to-blue-700',
    description: 'Global avatar service',
  },
  {
    name: 'GitLab',
    url: 'https://gitlab.com/aprodeosubarno',
    icon: Gitlab,
    color: 'from-orange-500 to-red-500',
    hoverColor: 'hover:from-orange-600 hover:to-red-600',
    description: 'DevOps platform',
  },
  {
    name: 'GitHub',
    url: 'https://github.com/kochan4php',
    icon: Github,
    color: 'from-gray-700 to-gray-900',
    hoverColor: 'hover:from-gray-800 hover:to-black',
    description: 'Code repositories',
  },
  {
    name: 'Dev.to',
    url: 'https://dev.to/aphrodeosubarno',
    icon: Code2,
    color: 'from-red-500 to-pink-500',
    hoverColor: 'hover:from-red-600 hover:to-pink-600',
    description: 'Developer community',
  },
  {
    name: 'LinkedIn',
    url: 'https://www.linkedin.com/in/aphrodeo-subarno',
    icon: Linkedin,
    color: 'from-blue-600 to-blue-700',
    hoverColor: 'hover:from-blue-700 hover:to-blue-800',
    description: 'Professional network',
  },
  {
    name: 'Portfolio',
    url: '/',
    icon: Briefcase,
    color: 'from-purple-500 to-pink-500',
    hoverColor: 'hover:from-purple-600 hover:to-pink-600',
    description: 'My work showcase',
  },
  {
    name: 'WhatsApp',
    url: 'https://wa.me/+628988928260',
    icon: MessageCircle,
    color: 'from-green-500 to-green-600',
    hoverColor: 'hover:from-green-600 hover:to-green-700',
    description: 'Direct messaging',
  },
  {
    name: 'Instagram',
    url: 'https://instagram.com/deo_sbrn',
    icon: Instagram,
    color: 'from-purple-600 via-pink-500 to-orange-400',
    hoverColor: 'hover:from-purple-700 hover:via-pink-600 hover:to-orange-500',
    description: 'Visual stories',
  },
];

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
