import "../css/app.css";

import { createInertiaApp } from "@inertiajs/react";
import { Input, registerBlock } from "@tbtop/inertia-admin";
import { createRoot } from "react-dom/client";
import { route as routeFn } from "ziggy-js";
import { TwoFactorSetupBlock } from "./admin/TwoFactorSetupBlock";

declare global {
	const route: typeof routeFn;
}

// Register the custom rating field for admin pages.
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
			<Input
				type="number"
				min={options.min ?? 1}
				max={max}
				step={options.step ?? 1}
				defaultValue={(ctx.binding?.value as number | undefined) ?? ""}
				onChange={(e) => ctx.binding?.onChange(Number(e.target.value))}
			/>
		);
	},
});

// Register the custom two-factor setup block (owns its own JSON fetches).
registerBlock<"twoFactorSetup", { setupUrl: string; confirmUrl: string }>({
	kind: "twoFactorSetup",
	behavior: "leaf",
	render: TwoFactorSetupBlock,
});

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
