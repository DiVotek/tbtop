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

export interface BlockDescriptor<TKind extends string = string, TOptions = unknown> {
	kind: TKind;
	behavior: BlockBehavior;
	render: ComponentType<RenderProps<TOptions>>;
	defaultOptions?: Partial<TOptions>;
}

// The heterogeneous store. `render` is contravariant in TOptions, so no
// generic BlockDescriptor is assignable to a shared one — the type-erased
// existential. We close TOptions at registration and cast once, here.
export type ErasedBlock = BlockDescriptor<string, unknown>;

const registry = new Map<string, ErasedBlock>();
const warnedKinds = new Set<string>();

export function registerBlock<TKind extends string, TOptions>(
	descriptor: BlockDescriptor<TKind, TOptions>,
): BlockDescriptor<TKind, TOptions> {
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
