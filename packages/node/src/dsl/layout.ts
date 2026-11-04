import { ActionBuilder } from "./action";
import {
	assertKnownKeys,
	type Columns,
	type IconSpec,
	metaKeys,
	normalizeIcon,
	oneOf,
	splitMeta,
	validateColumns,
	validateGap,
	validatePlacement,
} from "./meta";
import { includes, Node } from "./node";

const PLACEMENT = ["colSpan", "colStart"];

/** Options every layout container takes: classes, gap, grid placement and meta. */
export type LayoutOpts = {
	class?: string;
	gap?: number;
	colSpan?: Columns;
	colStart?: Columns;
	id?: string;
	hidden?: boolean;
	disabled?: boolean;
	hiddenIf?: unknown;
	disabledIf?: unknown;
};

export function layout(kind: string, children: unknown[], opts: Record<string, unknown>): Node {
	const [options, meta] = splitMeta(opts);
	return new Node(kind, { ...options, children }, null, meta);
}

export function checked(
	context: string,
	opts: Record<string, unknown>,
	allowed: string[],
): Record<string, unknown> {
	assertKnownKeys(context, opts, [...allowed, ...PLACEMENT, ...metaKeys()]);
	validatePlacement(opts);
	return opts;
}

export type FlexOpts = {
	direction?: "row" | "col";
	justify?: "start" | "center" | "end" | "between" | "around" | "evenly";
	align?: "start" | "center" | "end" | "stretch" | "baseline";
	gap?: number;
	wrap?: boolean;
	variant?: "card";
	class?: string;
};

/** S::flex(): direction plus the optional alignment keys, in wire order. */
export function flexNode(children: unknown[], opts: FlexOpts): Node {
	const direction = opts.direction ?? "row";
	oneOf(direction, ["row", "col"], "flex direction");
	const options: Record<string, unknown> = { direction, children };
	if (opts.justify !== undefined) {
		oneOf(
			opts.justify,
			["start", "center", "end", "between", "around", "evenly"],
			"flex justify",
		);
		options.justify = opts.justify;
	}
	if (opts.align !== undefined) {
		oneOf(opts.align, ["start", "center", "end", "stretch", "baseline"], "flex align");
		options.align = opts.align;
	}
	if (opts.gap !== undefined) {
		validateGap(opts.gap);
		options.gap = opts.gap;
	}
	if (opts.wrap === true) {
		options.wrap = true;
	}
	if (opts.variant !== undefined) {
		oneOf(opts.variant, ["card"], "flex variant");
		options.variant = opts.variant;
	}
	if (opts.class !== undefined) {
		options.class = opts.class;
	}
	return new Node("flex", options);
}

export type SectionOpts = LayoutOpts & {
	title?: string;
	description?: string;
	icon?: IconSpec;
	aside?: unknown;
	collapsible?: boolean;
	collapsed?: boolean;
	columns?: Columns;
	actions?: ActionBuilder[];
	url?: string;
	openUrlInNewTab?: boolean;
	variant?: "card" | "plain";
};

const SECTION_KEYS = [
	"title",
	"description",
	"icon",
	"aside",
	"collapsible",
	"collapsed",
	"columns",
	"actions",
	"url",
	"openUrlInNewTab",
	"variant",
	"class",
];

/** S::section(): keys rewritten in place so the author's order is the wire order. */
export function sectionNode(opts: SectionOpts, children: unknown[]): Node {
	const raw = checked("section", opts as Record<string, unknown>, SECTION_KEYS);
	if (opts.columns !== undefined) {
		validateColumns(opts.columns, "section columns");
	}
	const out: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(raw)) {
		Object.assign(out, sectionEntry(key, value, opts));
	}
	if (Array.isArray(out.actions) && out.actions.length === 0) {
		delete out.actions;
	}
	return layout("section", children, out);
}

function sectionEntry(key: string, value: unknown, opts: SectionOpts): Record<string, unknown> {
	switch (key) {
		case "url":
			if (typeof value !== "string" || value === "") {
				throw new Error("section 'url' must be a non-empty string.");
			}
			return opts.openUrlInNewTab === true ? { url: value, newTab: true } : { url: value };
		case "openUrlInNewTab":
			return {};
		case "icon":
			return { icon: normalizeIcon(value as IconSpec) };
		case "variant":
			oneOf(String(value), ["card", "plain"], "section variant");
			return { variant: value };
		case "actions":
			return { actions: sectionActions(value) };
		default:
			return { [key]: value };
	}
}

function sectionActions(actions: unknown): ActionBuilder[] {
	if (!Array.isArray(actions)) {
		throw new TypeError("section 'actions' must be a list of ActionBuilder.");
	}
	for (const action of actions) {
		if (!(action instanceof ActionBuilder)) {
			throw new Error("section 'actions' entries must be ActionBuilder.");
		}
	}
	return actions.filter(includes);
}
