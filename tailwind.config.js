/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './App.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        'transit-primary': '#0066CC',
        'transit-metro': '#003366',
        'transit-bus': '#00AA55',
        'transit-tram': '#CC0000',
        'transit-rer': '#7B68EE',
        'transit-alert': '#FF6600',
      },
    },
  },
  plugins: [],
};
