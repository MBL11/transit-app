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
        // Transit-specific color palette
        'transit-primary': '#0066CC',
        'transit-metro': '#003366',
        'transit-bus': '#00AA55',
        'transit-tram': '#CC0000',
        'transit-rer': '#7B68EE',
        'transit-alert': '#FF6600',

        // Extended transit palette with variants
        transit: {
          primary: {
            DEFAULT: '#0066CC',
            light: '#3385D6',
            dark: '#004C99',
          },
          metro: {
            DEFAULT: '#003366',
            light: '#004C99',
            dark: '#001A33',
          },
          bus: {
            DEFAULT: '#00AA55',
            light: '#33BB77',
            dark: '#008844',
          },
          tram: {
            DEFAULT: '#CC0000',
            light: '#D63333',
            dark: '#990000',
          },
          rer: {
            DEFAULT: '#7B68EE',
            light: '#9584F1',
            dark: '#5F4CDB',
          },
          alert: {
            DEFAULT: '#FF6600',
            light: '#FF8533',
            dark: '#CC5200',
          },
        },

        // UI colors
        background: {
          DEFAULT: '#FFFFFF',
          secondary: '#F5F5F5',
        },
        foreground: {
          DEFAULT: '#1A1A1A',
          secondary: '#666666',
          muted: '#999999',
        },
      },
    },
  },
  plugins: [],
};
