/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#f0f4ff',
          100: '#e0e9ff',
          200: '#c7d6ff',
          300: '#a4b8ff',
          400: '#7b8fff',
          500: '#5a69f8',
          600: '#4040e9',
          700: '#3333cc',
          800: '#2a29a5',
          900: '#1e1d7e',
          950: '#141356',
        },
        surface: {
          0: '#0f1117',
          1: '#161923',
          2: '#1c2230',
          3: '#232b3d',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
};
