/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        galaxy: {
          900: '#0a0a1a',
          800: '#12122a',
          700: '#1a1a3e',
          600: '#252555',
          500: '#3d3d7a',
          400: '#5c5c9e',
          300: '#8585c4',
          200: '#b3b3e0',
          100: '#d9d9f0',
        },
        nebula: {
          500: '#7c3aed',
          400: '#a78bfa',
        },
        star: {
          500: '#fbbf24',
          400: '#fcd34d',
        }
      },
      animation: {
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(124, 58, 237, 0.5)' },
          '100%': { boxShadow: '0 0 20px rgba(124, 58, 237, 0.8)' },
        }
      }
    },
  },
  plugins: [],
}
