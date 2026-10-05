import type { NavGroup, NavItem } from "./chromeContext";

export interface NavSectionRun {
	/** null = the group's unsectioned items, rendered without a heading. */
	heading: string | null;
	key: string;
	items: NavItem[];
}

/**
 * Splits a group's items into runs of one section each. The server already
 * emits items in section order, so grouping adjacent items is enough.
 */
export function sectionRuns(group: NavGroup): NavSectionRun[] {
	const labels = new Map((group.sections ?? []).map((section) => [section.key, section.label]));
	const runs: NavSectionRun[] = [];
	for (const item of group.items) {
		const key = item.section ?? "";
		const last = runs.at(-1);
		if (last && last.key === key) {
			last.items.push(item);
			continue;
		}
		runs.push({ key, heading: item.section ? (labels.get(key) ?? key) : null, items: [item] });
	}
	return runs;
}
