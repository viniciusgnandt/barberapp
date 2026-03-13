/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          50:  '#fdf9ef',
          100: '#faf0d2',
          200: '#f3dea0',
          300: '#eac764',
          400: '#e0a930',
          500: '#c9891a',
          600: '#ac6c14',
          700: '#8b5014',
          800: '#724017',
          900: '#5e3517',
          950: '#351a08',
        },
      },
      keyframes: {
        fadeUp:  { from: { opacity: 0, transform: 'translateY(14px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        fadeIn:  { from: { opacity: 0 }, to: { opacity: 1 } },
        slideIn: { from: { opacity: 0, transform: 'translateX(-10px)' }, to: { opacity: 1, transform: 'translateX(0)' } },
        scaleIn: { from: { opacity: 0, transform: 'scale(0.95)' }, to: { opacity: 1, transform: 'scale(1)' } },
      },
      animation: {
        'fade-up':  'fadeUp .3s ease forwards',
        'fade-in':  'fadeIn .25s ease forwards',
        'slide-in': 'slideIn .3s ease forwards',
        'scale-in': 'scaleIn .2s ease forwards',
      },
    },
  },
  plugins: [],
};

