import type { ClientActionContext } from "../structure/types";

export type CustomActionHandler = (
	ctx: ClientActionContext,
	params: Record<string, unknown>,
) => void | Promise<void>;

const registry = new Map<string, CustomActionHandler>();

/** Escape hatch for `kind: custom` action specs authored server-side. */
export function defineCustomAction(name: string, handler: CustomActionHandler): void {
	registry.set(name, handler);
}

export function getCustomAction(name: string): CustomActionHandler | undefined {
	return registry.get(name);
}
