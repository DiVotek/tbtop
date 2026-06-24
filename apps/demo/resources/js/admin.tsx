import "../css/app.css";

import { createInertiaApp } from "@inertiajs/react";
import { defineFieldClient, Input, registerBlock, registerIcon } from "@tbtop/inertia-admin";
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
