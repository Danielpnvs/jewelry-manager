/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        border: '#e5e7eb',
        'solarie': {
          50: '#FFFAB8',
          100: '#FFF9A8',
          200: '#FFF588',
          300: '#FFF168',
          400: '#FFED48',
          500: '#FFE629',
          600: '#E6CF24',
          700: '#CCB81F',
          800: '#B3A11A',
          900: '#998A15',
          950: '#FF29ED',
        }
      },
      backgroundImage: {
        'solarie-gradient': 'linear-gradient(135deg, #FFFAB8 0%, #FFE629 50%, #D9BB00 100%)',
        'solarie-gradient-dark': 'linear-gradient(135deg, #D9BB00 0%, #FFE629 50%, #FFFAB8 100%)',
      }
    },
  },
  plugins: [],
}
