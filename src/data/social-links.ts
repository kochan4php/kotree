import { SocialLink } from '@/interfaces';
import { Briefcase, FileText, Globe, Mail } from 'lucide-react';
import { FaDev, FaLinkedinIn } from 'react-icons/fa';
import { SiGithub, SiGitlab, SiInstagram } from 'react-icons/si';

export const socialLinks: SocialLink[] = [
  {
    name: 'Gravatar',
    url: 'https://gravatar.com/kochan4php',
    icon: Globe,
    color: '#1E8CBE',
    description: 'Global avatar service',
  },
  {
    name: 'Portfolio',
    url: 'https://portfolio.kochan.deno.net',
    icon: Briefcase,
    color: '#ff7c47',
    description: 'My work showcase',
  },
  {
    name: 'Resume',
    url: 'https://portfolio.kochan.deno.net/resume_aphrodeo-subarno.pdf',
    icon: FileText,
    color: '#f4e7df',
    description: 'Download my CV',
  },
  {
    name: 'Email',
    url: 'mailto:aprodeosubarno@gmail.com',
    icon: Mail,
    color: '#EA4335',
    description: 'Reach me directly',
  },
  {
    name: 'GitHub',
    url: 'https://github.com/kochan4php',
    icon: SiGithub,
    color: '#c9d1d9',
    description: 'Code repositories',
  },
  {
    name: 'GitLab',
    url: 'https://gitlab.com/aprodeosubarno',
    icon: SiGitlab,
    color: '#FC6D26',
    description: 'DevOps platform',
  },
  {
    name: 'LinkedIn',
    url: 'https://www.linkedin.com/in/aphrodeo-subarno',
    icon: FaLinkedinIn,
    color: '#0A66C2',
    description: 'Professional network',
  },
  {
    name: 'Dev.to',
    url: 'https://dev.to/aphrodeosubarno',
    icon: FaDev,
    color: '#c9d1d9',
    description: 'Developer community',
  },
  {
    name: 'Instagram',
    url: 'https://instagram.com/deo_sbrn',
    icon: SiInstagram,
    color: '#E4405F',
    description: 'Visual stories',
  },
];
