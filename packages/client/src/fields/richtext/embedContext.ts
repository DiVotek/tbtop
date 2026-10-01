import type { NodeKey } from "lexical";
import { createContext, useContext } from "react";
import type { ClientActionContext, StructureNode } from "../../structure/types";

type Bag = Record<string, unknown>;

/** One entry of a richtext field's `embeds` option, after materialize(). */
export interface EmbedDef {
	kind: string;
	label: string;
	icon?: string | null;
	summary?: string | null;
	fields: StructureNode[];
	/** Validates the modal form server-side; resolves with the data to store. */
	apply?: (ctx: ClientActionContext, form: Bag) => Promise<Bag>;
}

export interface EmbedController {
	defs: EmbedDef[];
	disabled: boolean;
	requestInsert: (def: EmbedDef) => void;
	requestEdit: (nodeKey: NodeKey) => void;
}

export const EmbedCtx = createContext<EmbedController | null>(null);

/** Null outside an editor that declares embeds (read-only views, legacy fields). */
export function useEmbedController(): EmbedController | null {
	return useContext(EmbedCtx);
}

/** An embed's data as a key bag; a list (PHP's empty `[]`) or a scalar has no keys. */
export function asBag(data: unknown): Bag {
	return data !== null && typeof data === "object" && !Array.isArray(data) ? (data as Bag) : {};
}

/** A summary field value, or the label when that value is not a non-empty string. */
export function embedSummary(def: EmbedDef, data: unknown): string {
	const value = def.summary ? asBag(data)[def.summary] : undefined;
	return typeof value === "string" && value.trim() !== "" ? value : def.label;
}
