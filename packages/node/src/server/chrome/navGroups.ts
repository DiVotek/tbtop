import type { IconSpec } from "../../dsl";
import { normalizeIcon } from "../../dsl/meta";
import { type Text, text } from "./text";

/**
 * NavGroup.php as data: meta for the sidebar group a page's `nav.group` names,
 * matched by this stable, unlocalized key.
 */
export interface NavGroupDef {
	key: string;
	/** Heading shown in the sidebar; default the key. */
	label?: Text;
	/** One muted line under the group's title. */
	description?: Text;
	icon?: IconSpec;
	collapsible?: boolean;
	/** Start collapsed (implies collapsible). */
	collapsed?: boolean;
	/** Named sections in render order, key → heading; pages opt in with `nav.section`. */
	sections?: Record<string, Text>;
}

export type WireItem = { label: string; href: string; order: number; section?: string } & Record<
	string,
	unknown
>;

/** The bucket of items that declare no group: emitted first, with `group: null`. */
export const UNGROUPED = "";

const byOrder = (a: WireItem, b: WireItem) => a.order - b.order;

/**
 * NavBuilder::assemble(): the ungrouped bucket first, declared groups in
 * declaration order, the rest in first-seen order; each group's items sorted
 * and arranged into sections.
 */
export function assembleGroups(groups: Map<string, WireItem[]>, declared: NavGroupDef[]) {
	const defs = new Map(declared.map((def, index) => [def.key, { def, index }]));
	const rank = (key: string) =>
		key === UNGROUPED ? -1 : (defs.get(key)?.index ?? Number.MAX_SAFE_INTEGER);
	return [...groups.keys()]
		.sort((a, b) => rank(a) - rank(b))
		.map((key) => wireGroup(key, groups.get(key) ?? [], defs.get(key)?.def));
}

function wireGroup(key: string, items: WireItem[], def: NavGroupDef | undefined) {
	const label = key === UNGROUPED ? null : text(def?.label ?? key);
	const arranged = arrangeSections(items.toSorted(byOrder), sectionLabels(def));
	return {
		key,
		group: label,
		items: arranged.items,
		...groupMeta(def),
		...(arranged.sections.length > 0 ? { sections: arranged.sections } : {}),
	};
}

function sectionLabels(def: NavGroupDef | undefined): Map<string, string> {
	return new Map(Object.entries(def?.sections ?? {}).map(([key, label]) => [key, text(label)]));
}

/** NavGroup::meta(): icon / collapsible / collapsed / description, each only when set. */
function groupMeta(def: NavGroupDef | undefined): Record<string, unknown> {
	if (def === undefined) {
		return {};
	}
	return {
		...(def.icon !== undefined ? { icon: normalizeIcon(def.icon) } : {}),
		...(def.collapsible === true || def.collapsed === true ? { collapsible: true } : {}),
		...(def.collapsed === true ? { collapsed: true } : {}),
		...(def.description !== undefined ? { description: text(def.description) } : {}),
	};
}

/** NavSections::arrange(): unsectioned → declared → undeclared (first seen); empty sections get no heading. */
export function arrangeSections(items: WireItem[], declared: Map<string, string>) {
	const buckets = new Map<string, WireItem[]>([...declared.keys()].map((key) => [key, []]));
	const unsectioned: WireItem[] = [];
	for (const item of items) {
		if (item.section === undefined) {
			unsectioned.push(item);
			continue;
		}
		buckets.set(item.section, [...(buckets.get(item.section) ?? []), item]);
	}
	const filled = [...buckets].filter(([, bucket]) => bucket.length > 0);
	return {
		items: [...unsectioned, ...filled.flatMap(([, bucket]) => bucket)],
		sections: filled.map(([key]) => ({ key, label: declared.get(key) ?? key })),
	};
}
