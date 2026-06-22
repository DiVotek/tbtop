import type { ModalSize } from "../ui/modal-shell";
import type {
	ActionColor,
	ActionConfig,
	ClientActionContext,
	NodeMeta,
	StructureNode,
} from "./types";

export interface ActionModalOpts {
	title: string;
	description?: string;
	body?: StructureNode | ((s: unknown) => StructureNode);
	size?: ModalSize;
	/** Backend data query: run on open, fed to the body via ModalDataProvider. */
	query?: (ctx: ClientActionContext) => Promise<unknown>;
}

export interface ActionOptionsBag {
	name?: string;
	label?: string;
	color?: ActionColor;
	handler?: Extract<ActionConfig, { handler: unknown }>["handler"];
	url?: Extract<ActionConfig, { url: unknown }>["url"];
	modal?: ActionModalOpts;
	keybinding?: ActionConfig["keybinding"];
	icon?: { name: string; position: string };
	tooltip?: string;
}

export interface ActionRenderProps {
	options: ActionOptionsBag;
	meta: NodeMeta;
	/** Pre-evaluated disabledIf result; the row/bulk cell owns evaluation. */
	disabled?: boolean;
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
