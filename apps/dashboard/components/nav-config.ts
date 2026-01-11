import { Home, BookOpen, Zap, Github, type LucideIcon } from 'lucide-react';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  external?: boolean;
}

export const navigationItems: NavItem[] = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/docs', label: 'Docs', icon: BookOpen },
  { href: '/playground', label: 'Playground', icon: Zap },
  {
    href: 'https://github.com/jeffgreendesign/guardrail-sim',
    label: 'GitHub',
    icon: Github,
    external: true,
  },
];
