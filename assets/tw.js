// Brand tokens for Tailwind CDN. Loaded right after the CDN script on every page.
tailwind.config = {
  theme: {
    extend: {
      colors: {
        ivory: { DEFAULT: '#F8F7F3', warm: '#F7F5EE', deep: '#F1EBDF' },
        champagne: { DEFAULT: '#E8DCC6', light: '#F0E7D6', gold: '#E8D4A7' },
        gold: { DEFAULT: '#C6A15B', fine: '#D4AF37', deep: '#A9843F', dark: '#8A6A2F' },
        ink: { DEFAULT: '#3A2F1E', soft: '#6B5A3E', faint: '#8E7D62' },
        stone: { DEFAULT: '#B7B7B2' },
      },
      fontFamily: {
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['Montserrat', 'system-ui', 'sans-serif'],
      },
      spacing: { section: 'clamp(4.5rem, 9vw, 8.5rem)' },
      maxWidth: { site: '76rem' },
    },
  },
};
