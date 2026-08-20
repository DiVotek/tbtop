import type { StructureNode } from "./types";

type Bag = Record<string, unknown>;

/**
 * The option keys that hold a node's structural children — the same set the
 * server walks in Node::nestedChildren(): `children`, repeater/sub-field
 * `fields`, and every `tabs[].body`. Every client walker that has to find the
 * fields of a form (constraints, serialization, tab error attribution,
 * translatable detection) must go through this, or the keys drift: each of
 * these walkers has at some point missed `tabs` or `fields` on its own.
 *
 * Deliberately excludes `create.fields` (a select's create mini-form is its own
 * form with its own controller and server validation), `prefix`/`suffix`
 * (fields in affixes are rejected), and table `filters`.
 */
export function structureChildren(options: Bag | undefined): StructureNode[] {
	if (!options) {
		return [];
	}
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
