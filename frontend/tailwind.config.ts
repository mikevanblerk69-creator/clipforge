import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
    './hooks/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#0A0A0A',
        surface: '#111111',
        'surface-2': '#1A1A1A',
        'surface-3': '#222222',
        border: '#2A2A2A',
        orange: {
          DEFAULT: '#FF6B2B',
          dark: '#E55A1F',
          light: '#FF8C5A',
          muted: 'rgba(255,107,43,0.15)',
        },
        cyan: {
          DEFAULT: '#00D4E8',
          dark: '#00B8C9',
          light: '#33DDED',
          muted: 'rgba(0,212,232,0.15)',
        },
        foreground: '#FAFAFA',
        muted: '#888888',
        'muted-foreground': '#666666',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Bebas Neue', 'cursive'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'gradient-orange-cyan': 'linear-gradient(135deg, #FF6B2B, #00D4E8)',
        'gradient-dark': 'linear-gradient(180deg, #0A0A0A 0%, #111111 100%)',
        'gradient-hero': 'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(255,107,43,0.15) 0%, transparent 60%)',
        'gradient-glow': 'linear-gradient(90deg, transparent, rgba(255,107,43,0.1), transparent)',
      },
      animation: {
        shimmer: 'shimmer 1.5s infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'fade-in': 'fade-in 0.5s ease-out',
        'slide-up': 'slide-up 0.5s ease-out',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 10px rgba(255,107,43,0.3)' },
          '50%': { boxShadow: '0 0 30px rgba(255,107,43,0.7)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
      boxShadow: {
        'glow-orange': '0 0 20px rgba(255,107,43,0.3)',
        'glow-orange-lg': '0 0 40px rgba(255,107,43,0.4)',
        'glow-cyan': '0 0 20px rgba(0,212,232,0.3)',
        'glow-cyan-lg': '0 0 40px rgba(0,212,232,0.4)',
        'card': '0 4px 24px rgba(0,0,0,0.4)',
        'card-hover': '0 8px 40px rgba(0,0,0,0.6)',
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}

export default config
