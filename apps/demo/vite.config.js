import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import laravel from "laravel-vite-plugin";
import { defineConfig } from "vite";

export default defineConfig({
	plugins: [
		laravel({
			input: ["resources/css/app.css", "resources/js/app.tsx", "resources/js/admin.tsx"],
			ssr: "resources/js/ssr.jsx",
			refresh: true,
		}),
		react(),
		tailwindcss(),
	],
	esbuild: {
		jsx: "automatic",
	},
	resolve: {
		// file:-linked @tbtop/inertia-admin must share one React instance
		dedupe: ["react", "react-dom", "@inertiajs/react"],
	},
	optimizeDeps: {
		exclude: ["@tbtop/inertia-admin"],
	},
});
