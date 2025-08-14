/** @type {import('tailwindcss').Config} Tells the code editor what type of file this is for autocompletion */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'transparent': 'transparent',
        
        'bama-crimson': '#005c84',
        'bama-burgundy': '#05648d',

        'black': '#22292f',
        'grey-darkest': '#3d4852',
        'grey-darker': '#606f7b',
        'grey-dark': '#8795a1',
        'grey': '#b8c2cc',
        'grey-light': '#dae1e7',
        'grey-lighter': '#f1f5f8',
        'grey-lighter-2': '#eaf1f7',
        'grey-lightest': '#f8fafc',
        'white': '#ffffff',

        'indigo-darkest': '#191e38',
        'indigo-darker': '#2f365f',
        'indigo-dark': '#5661b3',
        'indigo': '#6574cd',
        'indigo-light': '#7886d7',
        'indigo-lighter': '#b2b7ff',
        'indigo-lightest': '#e6e8ff',
      },
      fontFamily: {
        'roboto': ['Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

