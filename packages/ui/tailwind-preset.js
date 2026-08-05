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
        // AA-safe text variants — use these whenever accent/success/amber
        // carries text below 18px bold.
        'accent-deep': 'rgb(var(--accent-deep) / <alpha-value>)',
        'success-deep': 'rgb(var(--success-deep) / <alpha-value>)',
        'amber-deep': 'rgb(var(--amber-deep) / <alpha-value>)',
      },
      transitionDuration: {
        fast: '150ms',
        base: '250ms',
      },
      transitionTimingFunction: {
        'out-soft': 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      zIndex: {
        tabbar: '40',
        sticky: '45',
        header: '50',
        sheet: '60',
        modal: '60',
        toast: '70',
      },
      keyframes: {
        'sheet-up': {
          from: { transform: 'translateY(100%)' },
          to: { transform: 'translateY(0)' },
        },
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'toast-in': {
          from: { opacity: '0', transform: 'translateY(0.5rem)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'sheet-up': 'sheet-up 250ms cubic-bezier(0.22, 1, 0.36, 1)',
        'fade-in': 'fade-in 150ms ease-out',
        'toast-in': 'toast-in 150ms cubic-bezier(0.22, 1, 0.36, 1)',
      },
      // --font-sans / --font-mono are set by next/font in each app's root layout;
      // the literal family names stay as the fallback for any surface without it.
      fontFamily: {
        sans: ['var(--font-sans)', 'Inter', 'system-ui', 'sans-serif'],
        display: ['var(--font-sans)', 'Inter', 'system-ui', 'sans-serif'],
        body: ['var(--font-sans)', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', '"JetBrains Mono"', 'ui-monospace', 'monospace'],
        'mono-utility': ['var(--font-mono)', '"JetBrains Mono"', 'ui-monospace', 'monospace'],
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
