/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}', './index.html'],
  theme: {
    extend: {
      colors: {
        'mac-window': '#f5f5f7',
        'mac-button': '#e6e6e6',
        'mac-button-hover': '#d1d1d1',
        'mac-accent': '#007aff',
      },
      boxShadow: {
        'mac': '0 1px 2px rgba(0, 0, 0, 0.1)',
        'mac-hover': '0 2px 4px rgba(0, 0, 0, 0.1)',
      },
    },
  },
  plugins: [],
  safelist: [
    'bg-mac-window', 
    'bg-mac-button', 
    'bg-mac-button-hover', 
    'bg-mac-accent',
    'text-mac-accent',
    'shadow-mac',
    'shadow-mac-hover'
  ]
}; 