import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      colors: {
        primary: {
          DEFAULT: '#58CC02',
          foreground: '#FAFAF8',
        },
        secondary: {
          DEFAULT: '#6C63FF',
          foreground: '#FAFAF8',
        },
        accent: {
          DEFAULT: '#FF6B6B',
          foreground: '#FAFAF8',
        },
        background: '#FAFAF8',
        foreground: '#1A1A2E',
        muted: {
          DEFAULT: '#A8A8B3',
          foreground: '#1A1A2E',
        },
        card: {
          DEFAULT: '#FFFFFF',
          foreground: '#1A1A2E',
        },
      },
      fontFamily: {
        sans: ["'SideQuest Sans'", 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        lg: '1rem',
        xl: '1.25rem',
        '2xl': '1.5rem',
      },
      boxShadow: {
        sm: '0 2px 8px rgba(0, 0, 0, 0.05)',
        md: '0 4px 16px rgba(0, 0, 0, 0.08)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}

export default config
