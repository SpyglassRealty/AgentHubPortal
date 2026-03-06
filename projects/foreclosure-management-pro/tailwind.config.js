/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'spyglass': {
          'charcoal': '#2D2D2D',
          'dark': '#1A1A1A',
          'orange': '#FF5722',
          'orange-light': '#FF8A50',
          'gray': '#6B7280',
          'gray-light': '#9CA3AF',
        }
      },
      backgroundColor: {
        'primary': '#1A1A1A',
        'secondary': '#2D2D2D',
        'accent': '#FF5722',
      }
    },
  },
  plugins: [],
}