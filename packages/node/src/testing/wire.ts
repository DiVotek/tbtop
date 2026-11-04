import { builtInKinds } from "../dsl/fieldKinds";

export type WireNode = {
	kind: string;
	name?: string;
	options?: Record<string, unknown>;
	meta?: Record<string, unknown>;
};

/** A node with the form and modal action it sits in. */
export interface Entry {
	node: WireNode;
	form: string | null;
	modal: string | null;
}

const isNode = (value: unknown): value is WireNode =>
	value !== null &&
	typeof value === "object" &&
	typeof (value as WireNode).kind === "string" &&
	("options" in value || "meta" in value);

/**
 * Every node under `tree`: a walk over the StructureNode JSON a page ships,
 * so a tester sees exactly what the client receives, after every when() and
 * authorize() verdict.
 */
export function nodes(
	tree: unknown,
	form: string | null = null,
	modal: string | null = null,
): Entry[] {
	if (tree === null || typeof tree !== "object") {
		return [];
	}
	const out: Entry[] = [];
	const [inForm, inModal] = isNode(tree) ? scopeUnder(tree, form, modal) : [form, modal];
	if (isNode(tree)) {
		out.push({ node: tree, form, modal });
	}
	for (const child of Object.values(tree)) {
		out.push(...nodes(child, inForm, inModal));
	}
	return out;
}

/** The form and modal a node's children sit in. */
function scopeUnder(node: WireNode, form: string | null, modal: string | null) {
	const name = typeof node.name === "string" ? node.name : null;
	const isModal = node.kind === "action" && spec(node).type === "modal";
	return [node.kind === "form" ? name : form, isModal ? name : modal] as const;
}

export const ofKind = (tree: unknown, kind: string): Entry[] =>
	nodes(tree).filter((e) => e.node.kind === kind);

export const named = (tree: unknown, kind: string, name: string): Entry[] =>
	nodes(tree).filter((e) => e.node.kind === kind && e.node.name === name);

/** Field nodes, inside a form; only those named `name` when given. */
export function fields(tree: unknown, name?: string): Entry[] {
	const kinds = new Set(builtInKinds());
	return nodes(tree).filter(
		(e) =>
			e.form !== null &&
			kinds.has(e.node.kind) &&
			typeof e.node.name === "string" &&
			(name === undefined || e.node.name === name),
	);
}

/** Distinct names, for "on the page:" failure messages. */
export function nameList(entries: Entry[]): string {
	const names = [
		...new Set(entries.flatMap((e) => (e.node.name === undefined ? [] : [e.node.name]))),
	];
	return names.length === 0 ? "none" : names.join(", ");
}

/** The action spec of a node: `{ type, needs, body, query, form }`. */
export function spec(node: WireNode): {
	type?: string;
	needs?: string[];
	body?: unknown;
	query?: boolean;
	form?: string;
} {
	return (node.options?.spec ?? {}) as ReturnType<typeof spec>;
}
