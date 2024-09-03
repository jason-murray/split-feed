/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  safelist: [
    {
      pattern: /bg-+/, // 👈  This includes bg of all colors and shades
    },
    {
      pattern: /border-+/, // 👈  This includes bg of all colors and shades
    },
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}

