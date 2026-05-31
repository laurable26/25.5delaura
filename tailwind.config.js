/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'bg-main': '#F5F0FF',
        'bg-card': '#FFFFFF',
        'purple-dark': '#1C0A2E',
        'yellow-fest': '#FFE600',
        'pink-fluo': '#FF3EA5',
        'green-fluo': '#39FF14',
        'purple-mid': '#8B6BAE',
        border: '#E8DEFF',
      },
      fontFamily: {
        bangers: ['Bangers', 'cursive'],
        nunito: ['Nunito', 'sans-serif'],
      },
      maxWidth: {
        mobile: '430px',
      },
      borderRadius: {
        card: '16px',
        'card-lg': '20px',
        btn: '14px',
      },
      zIndex: {
        60: '60',
      },
    },
  },
  plugins: [],
}
