/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./dashboard-ia/frontend/src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        mio: {
          lime: '#bdf559',
          'lime-hover': '#c8ff6a',
          violet: '#602cd1', // WCAG 2.1 AA compliant (>= 4.5:1 against light surfaces)
          'violet-light': '#7647eb',
          surface: '#ffffff',
          paper: '#faf8f5',
          obsidian: '#0b0914',
          dark: '#111111',
          black: '#111111',
          border: '#111111',
          cyan: '#0ea5e9',
          amber: '#f59e0b',
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        display: ['"Climate Crisis"', 'sans-serif'],
        climate: ['"Climate Crisis"', 'sans-serif'],
        wellfleet: ['Wellfleet', 'monospace'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      fontSize: {
        'display-hero': ['clamp(2.75rem, 5.5vw, 4.75rem)', { lineHeight: '1.02', letterSpacing: '-0.04em' }],
        'display-manifesto': ['clamp(2.25rem, 4.5vw, 4rem)', { lineHeight: '1.05', letterSpacing: '-0.035em' }],
        'display-section': ['clamp(2rem, 3.8vw, 3.25rem)', { lineHeight: '1.1', letterSpacing: '-0.03em' }],
        'headline-card': ['clamp(1.15rem, 1.6vw, 1.4rem)', { lineHeight: '1.25', letterSpacing: '-0.02em' }],
        'telemetry-metric': ['clamp(2.2rem, 3.5vw, 3.2rem)', { lineHeight: '1', letterSpacing: '-0.04em' }],
        'label-mono': ['0.75rem', { lineHeight: '1.4', letterSpacing: '0.12em' }],
        'body-lead': ['clamp(1.125rem, 1.5vw, 1.25rem)', { lineHeight: '1.6', letterSpacing: '-0.015em' }],
      },
      borderRadius: {
        // One knob for the whole landing: containers are soft, data stays mechanical (rounded-none).
        mio: 'var(--mio-radius)',
        'mio-sm': 'calc(var(--mio-radius) * 0.6)',
      },
      boxShadow: {
        'neo-sm': '2px 2px 0px #111111',
        'neo-md': '4px 4px 0px #111111',
        'neo-lg': '6px 6px 0px #111111',
        'neo-xl': '8px 8px 0px #111111',
        'neo-2xl': '12px 12px 0px #111111',
        'neo-lime': '4px 4px 0px #bdf559',
        'neo-violet': '4px 4px 0px #602cd1',
      },
      spacing: {
        'section-standard': '7rem',
        'section-deep': '11rem',
        'section-hero': '8.5rem',
      },
    },
  },
  plugins: [],
}
