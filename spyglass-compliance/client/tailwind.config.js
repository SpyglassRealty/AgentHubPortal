/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Spyglass Realty brand colors
        primary: {
          DEFAULT: '#1A6B6B', // teal
          50: '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#1A6B6B', // primary
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
        },
        // Status colors
        status: {
          draft: '#6b7280',
          submitted: '#3b82f6',
          'in-review': '#f59e0b',
          'changes-requested': '#f97316',
          approved: '#10b981',
          closed: '#374151',
          cancelled: '#ef4444',
        }
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}