# CAST frontend (Vite 8 + React 19 + TypeScript + Tailwind 4)

## Scripts

```sh
npm install
npm run dev      # Vite on http://localhost:8050
npm run build    # tsc -b && vite build → build/
npm run preview  # serve the production build
```

API/image/WebSocket calls are proxied in `vite.config.ts` during `npm run dev`. Production builds are static files served by nginx; `/api`, `/users`, `/images`, and `/ws` are proxied there.

Environment variables used at build time must be prefixed with `VITE_` (for example `VITE_IMAGE_BASE_URL`, `VITE_API_URL`).
