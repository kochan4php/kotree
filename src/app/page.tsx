'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Briefcase, Check, Code2, Copy, ExternalLink, Github, Globe, Heart, Instagram, Linkedin, MessageCircle } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';

const socialLinks = [
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
    icon: Code2,
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

export default function LinktreePage() {
  const [clickCounts, setClickCounts] = useState<Record<string, number>>({});
  const [copied, setCopied] = useState(false);

  const handleLinkClick = (linkName: string) => {
    setClickCounts((prev) => ({
      ...prev,
      [linkName]: (prev[linkName] || 0) + 1,
    }));
  };

  const copyProfileUrl = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy URL:', JSON.stringify(err));
    }
  };

  return (
    <div className="min-h-screen p-4">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-purple-600/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-pink-400/20 to-orange-600/20 rounded-full blur-3xl"></div>
      </div>

      <div className="relative max-w-lg mx-auto">
        <Card className="bg-white/10 backdrop-blur-xl border-white/20 p-8 mb-8 text-center">
          <div className="relative">
            <div className="w-32 h-32 mx-auto rounded-full bg-gradient-to-br from-blue-400 to-purple-600 p-1">
              <Image src="https://avatars.githubusercontent.com/kochan4php" alt="Deo Subarno" className="rounded-full object-cover" priority width={120} height={120} />
            </div>
            <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-green-500 rounded-full border-4 border-white/20 flex items-center justify-center">
              <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
            </div>
          </div>

          <div className="relative flex flex-col items-center">
            <span className="text-3xl font-bold text-white">Deo Subarno</span>
            <span className="absolute top-1/2 -translate-y-1/2 text-sm font-bold text-white">a.k.a</span>
            <span className="text-3xl font-bold text-white mt-8">Kochan</span>
          </div>

          <Badge className="bg-gradient-to-r from-blue-500 via-purple-600 to-pink-500 text-white border-0 mb-4 animate-gradient-slow w-full text-base">
            <Code2 className="w-4 h-4 mr-2" />
            Software and Game Developer
          </Badge>

          <p className="text-white mb-6 leading-relaxed">Passionate about building scalable systems and web applications. Let&rsquo;s connect and create something amazing together! 🚀</p>

          <Button onClick={copyProfileUrl} variant="outline" className="bg-white/10 border-white/30 text-white hover:bg-white/20 transition-all duration-300">
            {copied ? (
              <>
                <Check className="w-4 h-4 mr-2" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 mr-2" />
                Share Profile
              </>
            )}
          </Button>
        </Card>

        <div className="space-y-4">
          {socialLinks.map((link, index) => (
            <Card
              key={link.name}
              className="group bg-white/10 backdrop-blur-lg border-white/20 p-0 overflow-hidden hover:scale-105 transition-all duration-300 hover:shadow-2xl hover:shadow-purple-500/25"
              style={{
                animationDelay: `${index * 100}ms`,
              }}>
              <Button
                className={`w-full h-16 bg-gradient-to-r ${link.color} text-white border-0 rounded-lg transition-all duration-300 group-hover:shadow-lg relative overflow-hidden animate-gradient`}
                onClick={() => handleLinkClick(link.name)}>
                {/* Animated background effect */}
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
                    {clickCounts[link.name] && <Badge className="bg-white/20 text-white text-xs">{clickCounts[link.name]} clicks</Badge>}
                    <ExternalLink className="w-5 h-5 opacity-60 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              </Button>
            </Card>
          ))}
        </div>

        <Card className="bg-white/10 backdrop-blur-xl border-white/20 p-6 mt-8">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-white">{Object.values(clickCounts).reduce((a, b) => a + b, 0)}</div>
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

        <div className="text-center mt-8 text-white/60 text-sm">
          <p>&copy; Copyright 2022 &#8211; {new Date().getFullYear()} Deo Subarno</p>
          <p className="mt-2">Made with ❤️ Built with Next.js & Tailwind CSS</p>
        </div>
      </div>
    </div>
  );
}
