import { getBlockDescriptor } from "../render/blockRegistry";
import type { StructureNode } from "./types";

type Bag = Record<string, unknown>;

/**
 * Recursively collects every field name declared under a structure node
 * (its own name, if it is a field, plus every field name nested inside
 * layout children / repeater fields / tab bodies). Used to attribute a
 * flat fieldErrors map (keyed by field name, possibly dotted for repeater
 * paths) back to the tab it lives under — see countTabErrors.
 */
export function collectFieldNames(node: StructureNode): string[] {
	const names: string[] = [];
	collectInto(node, names);
	return names;
}

function collectInto(node: StructureNode, out: string[]): void {
	const descriptor = getBlockDescriptor(node.kind);
	if (descriptor?.behavior === "field" && node.name) {
		out.push(node.name);
	}
	const options = (node.options as Bag | undefined) ?? {};
	for (const child of childNodes(options)) {
		collectInto(child, out);
	}
}

function childNodes(options: Bag): StructureNode[] {
	return [...nodeList(options.children), ...nodeList(options.fields), ...tabBodies(options.tabs)];
}

function nodeList(value: unknown): StructureNode[] {
	return Array.isArray(value) ? (value as StructureNode[]) : [];
}

function tabBodies(value: unknown): StructureNode[] {
	if (!Array.isArray(value)) {
		return [];
	}
	const out: StructureNode[] = [];
	for (const tab of value) {
		const body = (tab as { body?: StructureNode }).body;
		if (body) {
			out.push(body);
		}
	}
	return out;
}

/**
 * Counts fieldErrors entries that belong to a tab's field set. A repeater
 * path like "items.0.label" or a translatable "title.en" both belong to
 * the tab that declares "items"/"title" — match on the error key's root
 * segment (before the first dot), not just an exact name match.
 */
export function countTabErrors(fieldNames: string[], fieldErrors: Record<string, string>): number {
	if (fieldNames.length === 0) {
		return 0;
	}
	const names = new Set(fieldNames);
	let count = 0;
	for (const key of Object.keys(fieldErrors)) {
		const root = key.split(".")[0] ?? key;
		if (names.has(root)) {
			count++;
		}
	}
	return count;
}

/** Index of the first tab (by field-name membership) that owns a fieldErrors key, or null. */
export function firstTabIndexWithError(
	tabFieldNames: string[][],
	fieldErrors: Record<string, string>,
): number | null {
	for (let i = 0; i < tabFieldNames.length; i++) {
		if (countTabErrors(tabFieldNames[i] ?? [], fieldErrors) > 0) {
			return i;
		}
	}
	return null;
}
