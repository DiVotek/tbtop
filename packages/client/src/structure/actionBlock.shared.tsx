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
	slideOver?: boolean;
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
	/** Trigger button size; absent → the Button default (medium). */
	size?: "sm" | "md" | "lg";
	/** Render the trigger as an outlined button. */
	outlined?: boolean;
	/** Render the trigger styled as a link vs a button (default). */
	as?: "link" | "button";
}

export interface ActionRenderProps {
	options: ActionOptionsBag;
	meta: NodeMeta;
	/** Pre-evaluated disabledIf result; the row/bulk cell owns evaluation. */
	disabled?: boolean;
}

type ActionButtonVariant = "default" | "destructive" | "outline" | "secondary" | "link";

export const COLOR_TO_VARIANT: Record<ActionColor, ActionButtonVariant> = {
	default: "outline",
	primary: "default",
	danger: "destructive",
	success: "default",
	warning: "outline",
	gray: "secondary",
};

const SIZE_TO_BUTTON: Record<NonNullable<ActionOptionsBag["size"]>, "sm" | "default" | "lg"> = {
	sm: "sm",
	md: "default",
	lg: "lg",
};

/** Resolve the trigger button variant from link/outlined/color styling. */
export function actionVariant(opts: ActionOptionsBag): ActionButtonVariant {
	if (opts.as === "link") {
		return "link";
	}
	if (opts.outlined) {
		return "outline";
	}
	return COLOR_TO_VARIANT[opts.color ?? "default"];
}

/** Resolve the trigger button size; undefined → the Button default (medium). */
export function actionButtonSize(opts: ActionOptionsBag): "sm" | "default" | "lg" | undefined {
	return opts.size ? SIZE_TO_BUTTON[opts.size] : undefined;
}

/** Color-tint classes for an outlined trigger (neutral for other colors). */
export function outlinedTintClass(opts: ActionOptionsBag): string | undefined {
	if (!opts.outlined || opts.as === "link") {
		return undefined;
	}
	if (opts.color === "danger") {
		return "border-destructive text-destructive hover:bg-destructive/10";
	}
	if (opts.color === "primary") {
		return "border-primary text-primary hover:bg-primary/10";
	}
	return undefined;
}

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
