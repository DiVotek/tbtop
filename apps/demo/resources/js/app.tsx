import "../css/app.css";

import { createInertiaApp } from "@inertiajs/react";
import { registerBlock } from "@tbtop/inertia-admin";
import { resolvePageComponent } from "laravel-vite-plugin/inertia-helpers";
import { createRoot } from "react-dom/client";
import { route as routeFn } from "ziggy-js";
import { initializeTheme } from "./hooks/use-appearance";

declare global {
	const route: typeof routeFn;
}

// Two-phase registration: custom `rating` field client.
registerBlock<"rating", { max?: number; min?: number; step?: number }>({
	kind: "rating",
	behavior: "field",
	render: function RatingRender({ options, ctx }) {
		const max = options.max ?? 5;
		if (ctx.surface === "cell") {
			const val = ctx.binding?.value as number | null;
			return <span>{val ?? "–"}</span>;
		}
		return (
			<input
				type="number"
				min={options.min ?? 0}
				max={max}
				step={options.step ?? 1}
				defaultValue={(ctx.binding?.value as number | undefined) ?? 0}
				onChange={(e) => ctx.binding?.onChange(Number(e.target.value))}
			/>
		);
	},
});

const appName = import.meta.env.VITE_APP_NAME || "Laravel";

createInertiaApp({
	title: (title) => `${title} - ${appName}`,
	resolve: async (name) => {
		if (name === "admin/page") {
			const mod = await import("@tbtop/inertia-admin");
			return { default: mod.AdminPage };
		}
		return resolvePageComponent(`./pages/${name}.tsx`, import.meta.glob("./pages/**/*.tsx"));
	},
	setup({ el, App, props }) {
		const root = createRoot(el);

		root.render(<App {...props} />);
	},
	progress: {
		color: "#4B5563",
	},
});

// This will set light / dark mode on load...
initializeTheme();
