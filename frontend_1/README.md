# React + TypeScript + Tailwind CSS Setup (Create React App)

This guide sets up a frontend project using Create React App with TypeScript and Tailwind CSS (v3) for styling.

## 1. Create the React App with TypeScript

In your root directory, run:

```sh
npx create-react-app frontend_1 --template typescript
```

Navigate to the created folder with:
```sh
cd frontend_1
```

2. Install Tailwind CSS (v3)
Navigate into the project folder and run:

```sh
npm install -D tailwindcss@3.4.1 postcss autoprefixer
```
```sh
npx tailwindcss init -p
```
This will:
- Install Tailwind CSS and its PostCSS dependencies
- Generate tailwind.config.js
- Generate postcss.config.js

3. Configure Tailwind
Edit tailwind.config.js
Update the content array to include your source files:
```js
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

Edit src/index.css
Replace the contents of src/index.css with the Tailwind directives:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

Ensure postcss.config.js looks like this
```js
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

4. Start the Development Server
```sh
npm start
```
This will launch the app at http://localhost:3000 with Tailwind CSS working correctly.