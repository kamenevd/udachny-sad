/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: '#F7EFD9',
        surface: '#FCF6E4',
        ink: {
          DEFAULT: '#202A38',
          muted: '#5E6470',
        },
        red: {
          DEFAULT: '#BF2E24',
          press: '#9E241C',
        },
        gold: '#C99A2C',
        green: '#3E7B3A',
        blueink: '#2B4C7E',
      },
      boxShadow: {
        blank: '3px 3px 0 rgba(32,42,56,.25)',
      },
      fontFamily: {
        poster: ['Oswald', 'system-ui', 'sans-serif'],
        mono: ['"PT Mono"', 'monospace'],
      },
      keyframes: {
        'sheet-up': {
          from: { transform: 'translateY(100%)' },
          to: { transform: 'translateY(0)' },
        },
        // PLAN13 этап 2: staggered-появление карточек списков.
        // both — карточка невидима до старта анимации (animation-delay
        // задаётся инлайн через style={{ animationDelay }})
        'fade-in-up': {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'sheet-up': 'sheet-up 0.22s ease-out',
        'fade-in-up': 'fade-in-up 0.3s ease-out both',
      },
    },
  },
  plugins: [],
};