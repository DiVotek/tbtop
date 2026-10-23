// Package styles first: its :root token defaults must lose the cascade to the
// app's own theme in app.css. NOTE: admin.tsx is a Vite entry, so its CSS
// lands in the admin-*.css bundle which @vite() emits AFTER app.css —
// anything the package defines wins over app.css on equal specificity.
// Theme presets therefore belong at the END of the entry (below), not in
// app.css: they must come after the package import to override it.
import "@tbtop/inertia-admin/styles.css";
import "../css/app.css";
import "../css/themes/shadcn-stone.css";
import "../css/themes/shadcn-stone-emerald.css";
// To return to the plain stone base, comment the emerald line above.

import { createInertiaApp } from "@inertiajs/react";
import {
	AdminErrorPage,
	defineFieldClient,
	Input,
	registerBlock,
	registerIcon,
} from "@tbtop/inertia-admin";
import { Home, Image, List, Settings } from "lucide-react";
import { createRoot } from "react-dom/client";
import { route as routeFn } from "ziggy-js";
import { TwoFactorSetupBlock } from "./admin/TwoFactorSetupBlock";

declare global {
	const route: typeof routeFn;
}

interface RatingBag {
	max?: number;
	min?: number;
	step?: number;
}

function RatingCell({ value }: { value: number | null }) {
	return <span>{value ?? "–"}</span>;
}

function RatingForm({
	value,
	onChange,
	options,
}: {
	value: number | null;
	onChange: (next: number | null) => void;
	options?: RatingBag;
}) {
	return (
		<Input
			type="number"
			min={options?.min ?? 1}
			max={options?.max ?? 5}
			step={options?.step ?? 1}
			defaultValue={value ?? ""}
			onChange={(e) => onChange(Number(e.target.value))}
		/>
	);
}

// Register the custom rating field for admin pages.
defineFieldClient<"rating", number>("rating", { form: RatingForm, cell: RatingCell });

// Register the custom two-factor setup block (owns its own JSON fetches).
registerBlock<"twoFactorSetup", { setupUrl: string; confirmUrl: string }>({
	kind: "twoFactorSetup",
	behavior: "leaf",
	render: TwoFactorSetupBlock,
});

// Register extra sidebar nav icons (adds to the built-in icon set).
registerIcon("home", Home);
registerIcon("settings", Settings);
registerIcon("image", Image);
registerIcon("list", List);

const appName = import.meta.env.VITE_APP_NAME || "Laravel";

createInertiaApp({
	title: (title) => `${title} - ${appName}`,
	resolve: async (name) => {
		if (name === "admin/page") {
			const mod = await import("@tbtop/inertia-admin");
			return { default: mod.AdminPage };
		}
		if (name === "admin/error") {
			return { default: AdminErrorPage };
		}
		// Admin entry only handles admin/* pages.
		throw new Error(`[admin] No component found for page: ${name}`);
	},
	setup({ el, App, props }) {
		const root = createRoot(el);
		root.render(<App {...props} />);
	},
	progress: {
		color: "#4B5563",
	},
});
