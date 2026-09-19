import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
	base: "/",

	plugins: [react(), tailwindcss()],

	resolve: {
		alias: {
			"@": path.resolve(import.meta.dirname, "src"),
		},
		dedupe: ["react", "react-dom"],
	},

	root: path.resolve(import.meta.dirname),

	build: {
		outDir: path.resolve(import.meta.dirname, "dist/public"),
		emptyOutDir: true,
	},

	server: {
		port: 5173,
		host: "0.0.0.0",
		strictPort: true,
		allowedHosts: true,

		proxy: {
			"/api": {
				target: "http://localhost:3001",
				changeOrigin: true,
			},
			"/uploads": {
				target: "http://localhost:3001",
				changeOrigin: true,
			},
		},

		fs: {
			strict: true,
		},
	},

	preview: {
		port: 5173,
		host: "0.0.0.0",
		allowedHosts: true,
	},
});
