/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: {
          DEFAULT: '#070A12',
          card: '#121828',
          elevated: '#1A2338',
        },
        primary: {
          light: '#C4B5FD',
          DEFAULT: '#8B5CF6',
          dark: '#6D28D9',
          glow: 'rgba(139, 92, 246, 0.25)'
        },
        accent: {
          teal: '#06B6D4',
          emerald: '#10B981',
          amber: '#F59E0B',
          rose: '#F43F5E',
          violet: '#A855F7',
          cyan: '#38BDF8',
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        'glow-primary': '0 0 25px 0 rgba(139, 92, 246, 0.35)',
        'glow-teal': '0 0 25px 0 rgba(6, 182, 212, 0.35)',
        'glow-rose': '0 0 25px 0 rgba(244, 63, 94, 0.35)',
        'glow-emerald': '0 0 25px 0 rgba(16, 185, 129, 0.35)',
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.45)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shimmer': 'shimmer 2.5s linear infinite',
        'glow-pulse': 'glowPulse 2s ease-in-out infinite alternate',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        glowPulse: {
          '0%': { opacity: '0.4' },
          '100%': { opacity: '0.8' },
        }
      }
    },
  },
  plugins: [],
}
