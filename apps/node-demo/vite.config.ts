import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// The real React client, read from the tbtop checkout (as apps/demo does).
const clientSrc = (path: string) =>
	fileURLToPath(new URL(`../../packages/client/src/${path}`, import.meta.url));
const local = (path: string) => fileURLToPath(new URL(`./${path}`, import.meta.url));

// Vite only serves and builds the client; server.ts (Bun) answers every page
// and points the HTML at this dev server, or at the built manifest.
export default defineConfig(({ command }) => ({
	base: command === "build" ? "/build/" : "/",
	plugins: [react(), tailwindcss()],
	server: { port: 5173, strictPort: true, cors: true, origin: "http://localhost:5173" },
	build: {
		manifest: true,
		outDir: "public/build",
		rollupOptions: { input: "src/client.tsx" },
	},
	resolve: {
		dedupe: ["react", "react-dom", "@inertiajs/react", "@inertiajs/core"],
		alias: [
			{ find: "@tbtop/inertia-admin/styles.css", replacement: clientSrc("styles.css") },
			{ find: "@tbtop/inertia-admin", replacement: clientSrc("index.ts") },
			// The client's styles.css is Tailwind source; compile it with this app's Tailwind.
			{ find: /^tailwindcss$/, replacement: local("node_modules/tailwindcss/index.css") },
		],
	},
	optimizeDeps: { exclude: ["@tbtop/inertia-admin"] },
}));
