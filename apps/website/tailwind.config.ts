import type { Config } from 'tailwindcss';
import { createPreset } from 'fumadocs-ui/tailwind-plugin';

export default {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    '../../docs/**/*.mdx',
    './node_modules/fumadocs-ui/dist/**/*.js',
  ],
  presets: [createPreset()],
  theme: {
    extend: {
      fontFamily: {
        display: ['var(--font-display)'],
        sans: ['var(--font-sans)'],
        mono: ['var(--font-mono)'],
      },
      colors: {
        brand: {
          blue: '#3b82f6',
          'blue-dim': '#2563eb',
          dark: '#0a0a0a',
        },
      },
    },
  },
} satisfies Config;
