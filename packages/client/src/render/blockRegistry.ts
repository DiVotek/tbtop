import type { ComponentType, ReactNode } from "react";
import type { StructureNode } from "../structure/structure";

export type BlockBehavior = "leaf" | "container" | "field";

export interface NodeMeta {
	id?: string;
}

export interface FieldBinding {
	name: string;
	value: unknown;
	onChange: (next: unknown) => void;
	onBlur?: () => void;
	disabled?: boolean;
	invalid?: boolean;
}

export interface RenderContext {
	surface: "form" | "cell";
	form?: unknown;
	table?: unknown;
	binding?: FieldBinding;
}

export interface RenderProps<TOptions> {
	options: TOptions;
	meta: NodeMeta;
	ctx: RenderContext;
	children?: StructureNode[];
	renderChild: (node: StructureNode) => ReactNode;
}

/**
 * Binds a node to its page-scoped endpoints before render, the way built-in
 * kinds are wired inside materialize(). Third-party fields need this hook
 * because basePath exists only while materializing and never reaches render.
 *
 * Reserved kinds — `table`, `form`, `action`, `stat`, `select`, `relation`,
 * `upload`, `chart:*` — are handled by materialize() before the registry is
 * ever consulted, so a materialize hook registered under one is unreachable.
 */
export type BlockMaterializer = (node: StructureNode, basePath: string) => StructureNode;

// Kinds materialize()'s walk() intercepts by name before consulting the
// registry — a materialize hook registered under one of these is dead code.
const RESERVED_MATERIALIZE_KINDS: Record<string, true> = {
	table: true,
	form: true,
	action: true,
	stat: true,
	select: true,
	relation: true,
	upload: true,
};

export interface BlockDescriptor<TKind extends string = string, TOptions = unknown> {
	kind: TKind;
	behavior: BlockBehavior;
	render: ComponentType<RenderProps<TOptions>>;
	defaultOptions?: Partial<TOptions>;
	serialize?: (value: unknown, options: TOptions) => unknown;
	materialize?: BlockMaterializer;
}

// The heterogeneous store. `render` is contravariant in TOptions, so no
// generic BlockDescriptor is assignable to a shared one — the type-erased
// existential. We close TOptions at registration and cast once, here.
type ErasedBlock = BlockDescriptor<string, unknown>;

const registry = new Map<string, ErasedBlock>();
const warnedKinds = new Set<string>();

export function registerBlock<TKind extends string, TOptions>(
	descriptor: BlockDescriptor<TKind, TOptions>,
): BlockDescriptor<TKind, TOptions> {
	const isReserved =
		RESERVED_MATERIALIZE_KINDS[descriptor.kind] === true ||
		descriptor.kind.startsWith("chart:");
	if (
		descriptor.materialize &&
		isReserved &&
		process.env.NODE_ENV !== "production" &&
		markKindWarned(`materialize:${descriptor.kind}`)
	) {
		console.warn(
			`@tbtop/admin: kind "${descriptor.kind}" is reserved — its materialize hook will never run.`,
		);
	}
	registry.set(descriptor.kind, descriptor as unknown as ErasedBlock);
	return descriptor;
}

export function getBlockDescriptor(kind: string): BlockDescriptor | undefined {
	return registry.get(kind);
}

export function clearBlockRegistry(): void {
	registry.clear();
	warnedKinds.clear();
}

export function markKindWarned(kind: string): boolean {
	if (warnedKinds.has(kind)) {
		return false;
	}
	warnedKinds.add(kind);
	return true;
}
