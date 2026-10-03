import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#070A12',
        'background-alt': '#0B1020',
        surface: '#101625',
        'surface-elevated': '#131B2E',
        'surface-card': '#101625',
        'border-command': 'rgba(255, 255, 255, 0.08)',
        teamA: {
          DEFAULT: '#2563EB',
          accent: '#06B6D4',
        },
        teamB: {
          DEFAULT: '#E11D48',
          accent: '#F43F5E',
        },
        gold: '#F59E0B',
        success: '#10B981',
        warning: '#F59E0B',
        danger: '#EF4444',
      },
      fontFamily: {
        arabic: ['var(--font-cairo)', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
export default config;
