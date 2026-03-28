/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    screens: {
      sm: '940px',
      md: '1024px',
      lg: '1280px',
      xl: '1536px',
    },
    extend: {
      colors: {
        surface: {
          0: 'var(--background)',
          1: 'var(--surface-01)',
          2: 'var(--surface-02)',
          3: 'var(--surface-02)',
        },
        text: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          tertiary: 'var(--text-tertiary)',
          disabled: '#4A4F5C',
          inverse: 'var(--background)',
        },
        accent: {
          DEFAULT: 'var(--yellow)',
          hover: '#E0AF3E',
          pressed: '#C99B35',
          subtle: 'rgba(245, 194, 73, 0.08)',
          muted: 'rgba(245, 194, 73, 0.19)',
        },
        success: {
          DEFAULT: 'var(--green)',
          subtle: 'rgba(24, 179, 107, 0.12)',
        },
        warning: {
          DEFAULT: 'var(--orange)',
          subtle: 'rgba(245, 166, 35, 0.12)',
        },
        danger: {
          DEFAULT: 'var(--red)',
          subtle: 'rgba(232, 93, 93, 0.12)',
        },
        info: {
          DEFAULT: 'var(--blue)',
          subtle: 'rgba(91, 141, 239, 0.12)',
        },
        border: {
          DEFAULT: '#2A2B35',
          strong: '#3A3C48',
          accent: 'rgba(245, 194, 73, 0.25)',
        },
      },
      fontFamily: {
        sans: ['"Noto Sans"', 'system-ui', '-apple-system', 'sans-serif'],
      },
      fontSize: {
        'display': ['2rem', { lineHeight: '1.1', letterSpacing: '-0.02em', fontWeight: '800' }],
        'h1': ['1.5rem', { lineHeight: '1.2', letterSpacing: '-0.015em', fontWeight: '700' }],
        'h2': ['1.25rem', { lineHeight: '1.3', letterSpacing: '-0.01em', fontWeight: '700' }],
        'h3': ['1rem', { lineHeight: '1.4', letterSpacing: '-0.005em', fontWeight: '700' }],
        'body': ['0.9375rem', { lineHeight: '1.6', letterSpacing: '0em', fontWeight: '400' }],
        'body-sm': ['0.8125rem', { lineHeight: '1.5', letterSpacing: '0.005em', fontWeight: '400' }],
        'caption': ['0.6875rem', { lineHeight: '1.4', letterSpacing: '0.04em', fontWeight: '500' }],
      },
      borderRadius: {
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '20px',
        '2xl': '24px',
      },
    },
  },
  plugins: [],
}
