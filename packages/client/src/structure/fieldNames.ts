import { getBlockDescriptor } from "../render/blockRegistry";
import { structureChildren } from "./structureChildren";
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
	for (const child of structureChildren(options)) {
		collectInto(child, out);
	}
}

/**
 * Counts fieldErrors entries that belong to a tab's field set. A repeater
 * path like "items.0.label" or a translatable "title.en" both belong to
 * the tab that declares "items"/"title" — match on the error key's root
 * segment. Ignore a lifted root copy when its dotted source is also present.
 */
export function countTabErrors(fieldNames: string[], fieldErrors: Record<string, string>): number {
	if (fieldNames.length === 0) {
		return 0;
	}
	const names = new Set(fieldNames);
	const keys = Object.keys(fieldErrors);
	const nestedRoots = new Set(keys.filter((key) => key.includes(".")).map(errorRoot));
	let count = 0;
	for (const key of keys) {
		const root = errorRoot(key);
		if (names.has(root) && (key !== root || !nestedRoots.has(root))) {
			count++;
		}
	}
	return count;
}

function errorRoot(key: string): string {
	return key.split(".")[0] ?? key;
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
