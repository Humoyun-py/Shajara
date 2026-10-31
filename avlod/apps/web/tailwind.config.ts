import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#050C0A',
          900: '#07110E', // background
          850: '#0B1612',
          800: '#101C17', // secondary background
          700: '#14231C', // surface
          600: '#1C2F26',
          500: '#27402F',
        },
        gold: {
          200: '#EEDDB4',
          300: '#E3C88E',
          400: '#D5B16B', // accent
          500: '#BF9752',
          600: '#9A7840',
        },
        parchment: '#F4F0E7', // primary text
        sage: {
          300: '#C4CEC5',
          400: '#A8B4AA', // secondary text
          500: '#86948A',
          600: '#5F6E64',
        },
        danger: '#E08A7B',
      },
      fontFamily: {
        serif: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        sans: ['Manrope', 'system-ui', 'sans-serif'],
      },
      letterSpacing: { eyebrow: '0.32em' },
      boxShadow: {
        soft: '0 24px 60px -24px rgba(0,0,0,0.6)',
        lift: '0 30px 80px -30px rgba(0,0,0,0.75), 0 0 0 1px rgba(213,177,107,0.08)',
      },
      backgroundImage: {
        grain:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.5'/%3E%3C/svg%3E\")",
      },
    },
  },
  plugins: [],
} satisfies Config;
