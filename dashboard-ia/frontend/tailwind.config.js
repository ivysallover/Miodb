/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        mio: {
          lime: '#bdf559',
          violet: '#602cd1', // WCAG 2.1 AA compliant (>= 4.5:1 against light surfaces)
          'violet-light': '#7647eb',
          surface: '#f9f9fa',
          paper: '#faf8f5',
          obsidian: '#0b0914',
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      }
    }
  },
  plugins: []
};
