/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'bama-crimson': '#005c84',
        'bama-teal': '#005c84',
        'bama-burgundy': '#05648d',
        'gray': '#b8c2cc',
        'gray-light': '#f1f5f8',
        'indigo-focus': '#6574cd',
      },
    },
  },
  plugins: [],
}

