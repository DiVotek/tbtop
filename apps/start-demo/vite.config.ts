import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// The real React client, read from the tbtop checkout (as apps/demo does).
const clientSrc = (path: string) => fileURLToPath(new URL(`../../packages/client/src/${path}`, import.meta.url));
const local = (path: string) => fileURLToPath(new URL(`./src/${path}`, import.meta.url));

export default defineConfig({
	server: { port: 3000 },
	plugins: [tanstackStart(), react(), tailwindcss()],
	resolve: {
		dedupe: ["react", "react-dom"],
		alias: [
			{ find: "@tbtop/inertia-admin/styles.css", replacement: clientSrc("styles.css") },
			{ find: "@tbtop/inertia-admin", replacement: clientSrc("index.ts") },
			// The client's styles.css is Tailwind source; compile it with this app's Tailwind.
			{ find: /^tailwindcss$/, replacement: local("../node_modules/tailwindcss/index.css") },
			// Zero changes to the client: its 4 Inertia imports land on a TanStack Router shim.
			{ find: /^@inertiajs\/react$/, replacement: local("admin/inertia-shim.tsx") },
		],
	},
	optimizeDeps: { exclude: ["@tbtop/inertia-admin"] },
});
