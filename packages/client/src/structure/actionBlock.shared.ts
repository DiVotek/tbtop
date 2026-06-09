import type { ActionColor, ActionConfig, StructureNode } from "./types";

export interface ActionModalOpts {
	title: string;
	description?: string;
	body?: StructureNode | ((s: unknown) => StructureNode);
}

export interface ActionOptionsBag {
	name?: string;
	label?: string;
	color?: ActionColor;
	handler?: Extract<ActionConfig, { handler: unknown }>["handler"];
	url?: Extract<ActionConfig, { url: unknown }>["url"];
	modal?: ActionModalOpts;
	keybinding?: ActionConfig["keybinding"];
}

export interface ActionRenderProps {
	options: ActionOptionsBag;
	meta: { id?: string };
}

export const COLOR_TO_VARIANT: Record<ActionColor, "default" | "destructive" | "outline"> = {
	default: "outline",
	primary: "default",
	danger: "destructive",
	success: "default",
	warning: "outline",
};

export function actionKey(opts: ActionOptionsBag): string {
	return opts.name ?? opts.label ?? "unnamed";
}
