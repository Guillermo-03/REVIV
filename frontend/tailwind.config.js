/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'brand-green': '#2d6a4f',
        'brand-teal': '#52b788',
        'brand-blue': '#1d3557',
        'brand-sky': '#457b9d',
        'brand-neon': '#0effbe',
      },
      fontFamily: {
        'orbitron': ['Orbitron', 'monospace'],
      },
    },
  },
  plugins: [],
}

