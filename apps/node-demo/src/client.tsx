import "./styles.css";
import { createInertiaApp } from "@inertiajs/react";
import { AdminErrorPage, AdminPage } from "@tbtop/inertia-admin";
import { createRoot } from "react-dom/client";

// The same boot as apps/demo's admin.tsx: the client does not know its server is Bun.
void createInertiaApp({
	title: (title) => (title ? `${title} · tbtop` : "tbtop"),
	resolve: (name) => (name === "admin/error" ? AdminErrorPage : AdminPage),
	setup({ el, App, props }) {
		if (el !== null) {
			createRoot(el).render(<App {...props} />);
		}
	},
	progress: { color: "#4B5563" },
});
