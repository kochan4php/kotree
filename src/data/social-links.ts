import { SocialLink } from '@/interfaces';
import { Briefcase, Code2, Github, Gitlab, Globe, Instagram, Linkedin, MessageCircle } from 'lucide-react';

export const socialLinks: SocialLink[] = [
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
