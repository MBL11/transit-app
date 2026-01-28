/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './App.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Transit colors - İzmir official colors
        transit: {
          primary: '#E30613',     // İzmir Metro Red
          secondary: '#0066CC',   // Blue
          metro: '#E30613',       // Metro - Red
          bus: '#0066CC',         // ESHOT Bus - Blue
          tram: '#FF6600',        // Tramway - Orange
          izban: '#00A651',       // İzBAN - Green
          ferry: '#003366',       // Vapur - Dark Blue
          alert: '#FF6600',
        },
        // Semantic colors pour light/dark
        background: 'rgb(var(--background) / <alpha-value>)',
        foreground: 'rgb(var(--foreground) / <alpha-value>)',
        card: 'rgb(var(--card) / <alpha-value>)',
        'card-foreground': 'rgb(var(--card-foreground) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)',
        'muted-foreground': 'rgb(var(--muted-foreground) / <alpha-value>)',
        border: 'rgb(var(--border) / <alpha-value>)',
      },
    },
  },
  plugins: [],
};
