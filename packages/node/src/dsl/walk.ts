import { isConditionMet } from "./inclusion";
import { CHILD_KEYS, CHILD_LIST_KEYS, includes, Node } from "./node";

const ACTION_LIST_KEYS = ["headerActions", "rowActions", "bulkActions", "actions"];

interface HasChildFields {
	childFields(): unknown[];
}

interface HasEmbedFields {
	embedFields(): unknown[];
}

function hasChildFields(value: unknown): value is HasChildFields {
	return typeof (value as Partial<HasChildFields> | null)?.childFields === "function";
}

/**
 * The tree's one traversal (StructureWalk.php): which option keys hold
 * children and whether a child is included. Every reader goes through here.
 */
export function descendants(value: unknown): unknown[] {
	if (hasChildFields(value)) {
		return value.childFields();
	}
	if (value instanceof Node) {
		return fromOptions(value.options, false);
	}
	return [];
}

/** descendants(), widened to action lists and an action's modal body. */
export function actionSearchDescendants(node: Node): unknown[] {
	return fromOptions(node.options, true);
}

/** A builder resolved to its Node for the action-form search; null when it has none. */
export function resolveActionNode(value: unknown): Node | null {
	if (value instanceof Node) {
		return value;
	}
	const builder = value as { toNode?: () => unknown } | null;
	if (typeof builder?.toNode !== "function") {
		return null;
	}
	try {
		const node = builder.toNode();
		return node instanceof Node ? node : null;
	} catch {
		return null;
	}
}

/** First descendant (root included, embed fields too) the predicate accepts. */
export function find(root: unknown, matches: (value: unknown) => boolean): unknown {
	if (!isConditionMet(root)) {
		return null;
	}
	if (matches(root)) {
		return root;
	}
	const embeds = (root as Partial<HasEmbedFields> | null)?.embedFields?.() ?? [];
	for (const child of [...descendants(root), ...embeds]) {
		const found = find(child, matches);
		if (found !== null) {
			return found;
		}
	}
	return null;
}

/** Every descendant (root included) the predicate accepts. */
export function collect(root: unknown, matches: (value: unknown) => boolean): unknown[] {
	if (!isConditionMet(root)) {
		return [];
	}
	const out = matches(root) ? [root] : [];
	return [...out, ...descendants(root).flatMap((child) => collect(child, matches))];
}

/** collect() over a list of roots. */
export function collectAll(roots: unknown[], matches: (value: unknown) => boolean): unknown[] {
	return roots.flatMap((root) => collect(root, matches));
}

/** find() over a list of roots. */
export function findIn(roots: unknown[], matches: (value: unknown) => boolean): unknown {
	for (const root of roots) {
		const found = find(root, matches);
		if (found !== null) {
			return found;
		}
	}
	return null;
}

function fromOptions(options: Record<string, unknown>, withActions: boolean): unknown[] {
	const listKeys = withActions ? [...CHILD_LIST_KEYS, ...ACTION_LIST_KEYS] : CHILD_LIST_KEYS;
	const tabBodies = ((options.tabs as { body?: unknown }[] | undefined) ?? []).map(
		(tab) => tab?.body,
	);
	return [
		...listKeys.flatMap((key) => includedList(options[key])),
		...CHILD_KEYS.map((key) => options[key]),
		...(withActions ? actionNested(options) : []),
		...tabBodies,
	].filter((v) => v !== undefined && v !== null);
}

function actionNested(options: Record<string, unknown>): unknown[] {
	const body = options.body;
	const specBody = (options.spec as { body?: unknown } | undefined)?.body;
	return [body, specBody].filter((v) => v !== undefined && v !== null);
}

function includedList(value: unknown): unknown[] {
	return Array.isArray(value) ? value.filter(includes) : [];
}
