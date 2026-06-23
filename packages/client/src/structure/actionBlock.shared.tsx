import type { ReactNode } from "react";
import type { ModalSize } from "../ui/modal-shell";
import { NodeIcon } from "../ui/node-icon";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
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
	/** Submit-type actions render as <button type="submit"> so Enter submits the form. */
	isSubmit?: boolean;
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

export function ActionLabel({ opts }: { opts: ActionOptionsBag }) {
	const text = opts.label ?? opts.name;
	if (!opts.icon) {
		return <>{text}</>;
	}
	const icon = <NodeIcon icon={opts.icon} className="size-4 shrink-0" />;
	if (opts.icon.position === "right") {
		return (
			<>
				{text}
				{icon}
			</>
		);
	}
	return (
		<>
			{icon}
			{text}
		</>
	);
}

export function MaybeTooltip({
	tooltip,
	disabled,
	children,
}: {
	tooltip?: string;
	disabled?: boolean;
	children: ReactNode;
}) {
	if (!tooltip) {
		return <>{children}</>;
	}
	return (
		<Tooltip>
			<TooltipTrigger asChild>
				{disabled ? <span className="inline-flex">{children}</span> : children}
			</TooltipTrigger>
			<TooltipContent>{tooltip}</TooltipContent>
		</Tooltip>
	);
}
