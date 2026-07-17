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
    },
  },
  plugins: [],
};