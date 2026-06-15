import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import laravel from "laravel-vite-plugin";
import { defineConfig } from "vite";

const clientSrc = (path) =>
	fileURLToPath(new URL(`../../packages/client/src/${path}`, import.meta.url));

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
		// Dev reads the package source for HMR; the published exports point at
		// dist. Subpath alias is listed first so it wins over the bare one.
		alias: [
			{ find: "@tbtop/inertia-admin/styles.css", replacement: clientSrc("styles.css") },
			{ find: "@tbtop/inertia-admin", replacement: clientSrc("index.ts") },
		],
	},
	optimizeDeps: {
		exclude: ["@tbtop/inertia-admin"],
	},
});
