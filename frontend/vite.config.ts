import { defineConfig } from "vite";
import path from "node:path";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
	plugins: [react(), tailwindcss()],
	resolve: {
		alias: {
			"@": path.resolve(import.meta.dirname, "./src"),
		},
	},
	server: {
		host: "0.0.0.0",
		port: 8050,
		strictPort: true,
		// Bind mounts on Windows/macOS do not reliably emit inotify events.
		watch: {
			usePolling: true,
			interval: 300,
		},
		// Browser talks to nginx on :80; Vite itself is not published.
		hmr: {
			protocol: "ws",
			clientPort: 80,
		},
	},
	build: {
		outDir: "build",
	},
});
