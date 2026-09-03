import { defineConfig } from "vite";
import path from "node:path";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const proxyTarget = "http://localhost:8051";

export default defineConfig({
	plugins: [react(), tailwindcss()],
	resolve: {
		alias: {
			"@": path.resolve(import.meta.dirname, "./src"),
		},
	},
	server: {
		port: 8050,
		proxy: {
			"/api": { target: proxyTarget, changeOrigin: true },
			"/users": { target: proxyTarget, changeOrigin: true },
			"/images": { target: proxyTarget, changeOrigin: true },
			"/ws": { target: proxyTarget, changeOrigin: true, ws: true },
		},
	},
	build: {
		outDir: "build",
	},
});
