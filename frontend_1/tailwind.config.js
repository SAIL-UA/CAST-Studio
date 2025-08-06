/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'bama-crimson': '#005c84',
        'bama-burgundy': '#05648d',
        'cool-gray': '#eaf1f7',
        'indigo-focus': '#6574cd',
      },
    },
  },
  plugins: [],
}

