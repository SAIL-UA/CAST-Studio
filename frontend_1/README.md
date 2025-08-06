# README Fronted

In the root directory, run
```sh
npx create-react-app frontend_1 --template typescript
```

To install tailwind, run in powershell:
```sh
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss-cli@latest init -p
```

In tailwind.config.js, add:
```sh
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

In `src/index.css`, add:
```sh
@tailwind base;
@tailwind components;
@tailwind utilities;
```