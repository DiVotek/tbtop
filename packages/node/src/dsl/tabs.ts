import { checked, layout } from "./layout";
import { type Columns, type IconSpec, normalizeIcon, splitMeta, validateColumns } from "./meta";
import { includes, Node } from "./node";

/** One tab: a single `body` XOR `children` (optionally in `columns`). */
export type TabSpec = {
	name?: string;
	label?: string;
	body?: unknown;
	children?: unknown[];
	columns?: Columns;
	icon?: IconSpec;
	badge?: string | number;
	active?: boolean;
};

/** S::tabs(): a named block needs a unique name on every tab. */
export function tabsNode(tabs: TabSpec[], opts: Record<string, unknown>): Node {
	const [options, meta] = splitMeta(checked("tabs", opts, ["name"]));
	const name = options.name as string | undefined;
	delete options.name;
	if (name !== undefined && (typeof name !== "string" || name === "")) {
		throw new Error("Named tabs block needs a non-empty string name.");
	}
	const items = tabs.map((tab) => normalizeTab(tab, name !== undefined));
	if (name !== undefined) {
		const names = items.map((item) => item.name);
		if (new Set(names).size !== names.length) {
			throw new Error(`Duplicate tab name on tabs block "${name}".`);
		}
	}
	return new Node("tabs", { ...options, tabs: items }, name ?? null, meta);
}

function normalizeTab(tab: TabSpec, needsName: boolean): Record<string, unknown> {
	const label = tabLabel(tab, needsName);
	const out: Record<string, unknown> = tab.name === undefined ? {} : { name: tab.name };
	out.label = label;
	out.body = tabBody(tab, label);
	if (tab.icon !== undefined) {
		out.icon = normalizeIcon(tab.icon);
	}
	if (tab.badge !== undefined) {
		out.badge = String(tab.badge);
	}
	if (tab.active === true) {
		out.active = true;
	}
	return out;
}

function tabLabel(tab: TabSpec, needsName: boolean): string {
	if (tab.name !== undefined && (typeof tab.name !== "string" || tab.name === "")) {
		throw new Error("Tab name must be a non-empty string.");
	}
	if (needsName && tab.name === undefined) {
		throw new Error("Every tab in a named tabs block needs a name.");
	}
	const label = tab.label ?? tab.name;
	if (typeof label !== "string" || label === "") {
		throw new Error("Tab needs a label or name.");
	}
	return label;
}

function tabBody(tab: TabSpec, label: string): unknown {
	if (tab.body !== undefined && tab.body !== null) {
		if (tab.children !== undefined || tab.columns !== undefined) {
			throw new Error(`Tab "${label}" cannot combine 'body' with 'children'/'columns'.`);
		}
		return includes(tab.body) ? tab.body : layout("stack", [], {});
	}
	if (tab.children === undefined) {
		throw new Error(`Tab "${label}" needs either 'body' or 'children'.`);
	}
	if (tab.columns !== undefined) {
		validateColumns(tab.columns, "grid cols");
		return layout("grid", tab.children, { cols: tab.columns });
	}
	return layout("stack", tab.children, {});
}
