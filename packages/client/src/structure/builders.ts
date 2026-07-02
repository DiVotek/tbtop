import type { IconDef } from "../ui/node-icon";
import type { ChartBlockOptions } from "./chartBlock";
import type { FormOptions, NodeMeta, StructureNode, TabItem, TableOptions } from "./types";

const META_KEYS = new Set(["id", "hidden", "disabled"]);

type Bag = Record<string, unknown>;

interface SplitResult {
	options: Bag;
	meta: NodeMeta;
}

function splitMeta(input: Bag | undefined): SplitResult {
	const options: Bag = {};
	const meta: Bag = {};
	if (!input) {
		return { options, meta: meta as NodeMeta };
	}
	for (const key of Object.keys(input)) {
		if (META_KEYS.has(key)) {
			meta[key] = input[key];
		} else {
			options[key] = input[key];
		}
	}
	return { options, meta: meta as NodeMeta };
}

export function layoutChildrenFirst(kind: string) {
	return (children: StructureNode[], opts?: Bag): StructureNode => {
		const split = splitMeta(opts);
		return { kind, options: { ...split.options, children }, meta: split.meta };
	};
}

export function layoutOptsFirst(kind: string) {
	return (opts: Bag, children: StructureNode[]): StructureNode => {
		const split = splitMeta(opts);
		return { kind, options: { ...split.options, children }, meta: split.meta };
	};
}
/** Section layout: normalizes a bare-string icon to {name, position} like buildTab. */
export function buildSection(opts: Bag, children: StructureNode[]): StructureNode {
	const split = splitMeta(opts);
	const { icon, ...rest } = split.options;
	let normalizedIcon: IconDef | undefined;
	if (icon !== undefined) {
		normalizedIcon =
			typeof icon === "string"
				? { name: icon, position: "left" }
				: { position: "left", ...(icon as IconDef) };
	}
	return {
		kind: "section",
		options: { ...rest, ...(normalizedIcon ? { icon: normalizedIcon } : {}), children },
		meta: split.meta,
	};
}

export function buildTabs(items: TabItem[], opts?: Bag): StructureNode {
	const split = splitMeta(opts);
	return { kind: "tabs", options: { ...split.options, tabs: items }, meta: split.meta };
}

export function buildTab(
	label: string,
	body: StructureNode,
	opts?: { icon?: string | IconDef; badge?: string | number },
): TabItem {
	const tab: TabItem = { label, body };
	if (opts?.icon !== undefined) {
		tab.icon =
			typeof opts.icon === "string"
				? { name: opts.icon, position: "left" }
				: { position: "left", ...opts.icon };
	}
	if (opts?.badge !== undefined) {
		tab.badge = String(opts.badge);
	}
	return tab;
}

type ChildrenInput = StructureNode[] | ((s: unknown) => StructureNode[]);

export function makeBuildForm(sProxy: unknown) {
	return function buildForm(opts: Bag & FormOptions, children: ChildrenInput): StructureNode {
		const split = splitMeta(opts);
		const resolved = typeof children === "function" ? children(sProxy) : children;
		return {
			kind: "form",
			options: { ...split.options, children: resolved },
			meta: split.meta,
		};
	};
}

export function buildTable(opts: Bag & TableOptions<unknown>): StructureNode {
	const split = splitMeta(opts);
	return { kind: "table", options: split.options, meta: split.meta };
}

export function buildChart(opts: Bag & ChartBlockOptions): StructureNode {
	const split = splitMeta(opts);
	return { kind: `chart:${opts.type}`, options: split.options, meta: split.meta };
}

export function makeField(kind: string) {
	return (input: Bag & { name: string }): StructureNode => {
		const { name, ...rest } = input;
		const split = splitMeta(rest);
		return { kind, name, options: split.options, meta: split.meta };
	};
}

type SubFieldsFn = (s: unknown) => StructureNode[];

export function makeRepeaterField(sProxy: unknown) {
	return (
		input: Bag & { name: string; fields: SubFieldsFn | StructureNode[] },
	): StructureNode => {
		const { name, fields, ...rest } = input;
		const split = splitMeta(rest);
		const resolved = typeof fields === "function" ? fields(sProxy) : fields;
		return {
			kind: "repeater",
			name,
			options: { ...split.options, fields: resolved },
			meta: split.meta,
		};
	};
}

interface WidgetInput {
	component: unknown;
	props?: unknown;
}

export function buildWidget(input: WidgetInput): StructureNode {
	return {
		kind: "widget",
		options: { component: input.component, props: input.props },
		meta: {},
	};
}

export function buildCollapsible(
	opts: Bag & { label: string; collapsed?: boolean },
	children: StructureNode[],
): StructureNode {
	const { collapsed = false, ...rest } = opts;
	const split = splitMeta(rest);
	return {
		kind: "collapsible",
		options: { ...split.options, collapsed, children },
		meta: split.meta,
	};
}

export function buildAside(children: StructureNode[], opts?: Bag): StructureNode {
	const split = splitMeta(opts);
	return { kind: "aside", options: { ...split.options, children }, meta: split.meta };
}

export function buildActionGroup(
	label: string,
	children: StructureNode[],
	as?: "buttons" | "dropdown",
): StructureNode {
	const options: Record<string, unknown> = { label, children };
	if (as !== undefined) {
		options.as = as;
	}
	return { kind: "actionGroup", options, meta: {} };
}
