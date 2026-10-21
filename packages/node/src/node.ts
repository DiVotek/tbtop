/**
 * The wire node: the exact shape `structure.schema.json` describes and the
 * React client (`@tbtop/inertia-admin`) renders. Every builder ends here.
 */
export interface WireNode {
	kind: string;
	options: Record<string, unknown>;
	meta: Record<string, unknown>;
	name?: string;
}

/** Anything that serializes to a wire node: a builder or a hand-written node. */
export interface Buildable {
	toNode(): WireNode;
}

export type Child = Buildable | WireNode;

export function node(
	kind: string,
	options: Record<string, unknown> = {},
	{ name, meta = {} }: { name?: string; meta?: Record<string, unknown> } = {},
): WireNode {
	return name === undefined ? { kind, options, meta } : { kind, options, meta, name };
}

export function isBuildable(value: unknown): value is Buildable {
	return (
		typeof value === "object" &&
		value !== null &&
		typeof (value as Buildable).toNode === "function"
	);
}

export function toWire(child: Child): WireNode {
	return isBuildable(child) ? child.toNode() : child;
}

/** Drop undefined keys so the wire carries only what was authored. */
export function compact<T extends Record<string, unknown>>(record: T): T {
	return Object.fromEntries(Object.entries(record).filter(([, v]) => v !== undefined)) as T;
}

/**
 * A layout node that keeps its children as builders, so the server can walk
 * them (forms, actions, tables) and the type system can infer form values.
 */
export class Container<C extends readonly Child[] = readonly Child[]> implements Buildable {
	declare readonly __children: C;
	private extra: Record<string, unknown> = {};

	constructor(
		readonly kind: string,
		readonly children: C,
		options: Record<string, unknown> = {},
	) {
		this.extra = options;
	}

	set(key: string, value: unknown): this {
		this.extra[key] = value;
		return this;
	}

	toNode(): WireNode {
		return node(this.kind, compact({ ...this.extra, children: this.children.map(toWire) }));
	}
}

/** Depth-first walk over builders; the one traversal the server uses (cf. StructureWalk.php). */
export function walk(root: unknown, visit: (value: unknown) => void): void {
	visit(root);
	if (root instanceof Container) {
		for (const child of root.children) {
			walk(child, visit);
		}
	}
	const nested = (root as { walkChildren?: () => readonly unknown[] } | null)?.walkChildren?.();
	for (const child of nested ?? []) {
		walk(child, visit);
	}
}
