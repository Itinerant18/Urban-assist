// Tailwind preset shared across all three apps.
// Matches the Urban Assist design system (DESIGN-customer.md).

/** @type {import('tailwindcss').Config} */
module.exports = {
  theme: {
    extend: {
      colors: {
        bg: 'rgb(var(--bg) / <alpha-value>)',
        ink: 'rgb(var(--ink) / <alpha-value>)',
        charcoal: 'rgb(var(--charcoal) / <alpha-value>)',
        accent: 'rgb(var(--accent) / <alpha-value>)',
        'accent-hover': 'rgb(var(--accent-hover) / <alpha-value>)',
        success: 'rgb(var(--success) / <alpha-value>)',
        danger: 'rgb(var(--danger) / <alpha-value>)',
        amber: 'rgb(var(--amber) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)',
        hairline: 'rgb(var(--hairline) / <alpha-value>)',
        'input-border': 'rgb(var(--input-border) / <alpha-value>)',
        'footer-muted': 'rgb(var(--footer-muted) / <alpha-value>)',
        'footer-faint': 'rgb(var(--footer-faint) / <alpha-value>)',
        'surface-sunk': 'rgb(var(--surface-sunk) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Inter', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
        'mono-utility': ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        xl: '14px',
        '2xl': '18px',
        '3xl': '24px',
      },
      screens: {
        xs: '360px',
        sm: '640px',
        lg: '1024px',
        '2xl': '1440px',
      },
      boxShadow: {
        card: '0 4px 14px rgba(31,58,77,0.05)',
        hero: '0 8px 24px rgba(31,58,77,0.06)',
      },
      maxWidth: {
        page: '1440px',
      },
    },
  },
  plugins: [],
};
