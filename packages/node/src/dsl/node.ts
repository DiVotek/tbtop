import { isConditionMet } from "./inclusion";

/** The wire node `structure.schema.json` describes and the React client renders. */
export interface WireNode {
	kind: string;
	options: Record<string, unknown>;
	meta: Record<string, unknown>;
	name?: string;
}

/** Option keys holding a plain list of children, whatever the node's kind. */
export const CHILD_LIST_KEYS = ["children", "fields"] as const;

/** Option keys holding one nested child. */
export const CHILD_KEYS = ["prefix", "suffix"] as const;

/**
 * An immutable wire node (Node.php). Options may still hold builders: they
 * serialize lazily through toJSON, parent first, exactly like jsonSerialize().
 */
export class Node {
	readonly options: Record<string, unknown>;
	private included = true;

	// oxlint-disable-next-line max-params -- mirrors Node.php's (kind, options, name, meta)
	constructor(
		readonly kind: string,
		options: Record<string, unknown> = {},
		readonly name: string | null = null,
		readonly meta: Record<string, unknown> = {},
	) {
		this.options = filterChildLists(options);
	}

	/** Conditional existence — returns a copy, the node itself never changes. */
	when(condition: boolean | (() => unknown)): Node {
		const clone = new Node(this.kind, this.options, this.name, this.meta);
		clone.included = typeof condition === "function" ? Boolean(condition()) : condition;
		return clone;
	}

	isIncluded(): boolean {
		return this.included;
	}

	/** Copy with a new options bag, keeping name, meta and the when() verdict. */
	withOptions(options: Record<string, unknown>): Node {
		const clone = new Node(this.kind, options, this.name, this.meta);
		clone.included = this.included;
		return clone;
	}

	toJSON(): Record<string, unknown> {
		const out: Record<string, unknown> = {
			kind: this.kind,
			options: this.options,
			meta: this.meta,
		};
		if (this.name !== null) {
			out.name = this.name;
		}
		return out;
	}
}

function filterChildLists(options: Record<string, unknown>): Record<string, unknown> {
	const out = { ...options };
	for (const key of CHILD_LIST_KEYS) {
		const list = out[key];
		if (Array.isArray(list)) {
			out[key] = list.filter(includes);
		}
	}
	for (const key of CHILD_KEYS) {
		if (!(key in out)) {
			continue;
		}
		if (includes(out[key])) {
			continue;
		}
		delete out[key];
	}
	return out;
}

/** Gate check behind authorize() plus the when() verdict (ChildInclusion.php). */
export function includes(child: unknown): boolean {
	const gated = child as { isAuthorized?: () => boolean } | null;
	if (typeof gated?.isAuthorized === "function" && !gated.isAuthorized()) {
		return false;
	}
	return isConditionMet(child);
}

/**
 * The plain-data form of anything in the tree, as the client receives it.
 * Async because server closures (a stat value, list items, a live region)
 * may await a database; each toJSON runs parent first, as in PHP.
 */
export async function materialize<T = unknown>(value: unknown): Promise<T> {
	const resolved = await value;
	const json = hasToJSON(resolved) ? await resolved.toJSON() : resolved;
	if (Array.isArray(json)) {
		const out: unknown[] = [];
		for (const item of json) {
			out.push(await materialize(item));
		}
		return out as T;
	}
	if (json !== null && typeof json === "object") {
		return (await materializeObject(json as Record<string, unknown>)) as T;
	}
	return json as T;
}

async function materializeObject(json: Record<string, unknown>): Promise<Record<string, unknown>> {
	const out: Record<string, unknown> = {};
	for (const [key, item] of Object.entries(json)) {
		if (item !== undefined) {
			out[key] = await materialize(item);
		}
	}
	return out;
}

function hasToJSON(value: unknown): value is { toJSON(): unknown } {
	return typeof (value as { toJSON?: unknown } | null)?.toJSON === "function";
}
