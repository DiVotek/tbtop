/**
 * Pure reorder helpers — no React, no DOM. The drag interaction is wired in
 * grid.tsx/sortableRow.tsx; the order math and the disable predicate live here
 * so they can be tested as a black box.
 */
import { arrayMove } from "@dnd-kit/sortable";

/** New id order after dropping activeId onto overId. */
export function computeReorder(ids: string[], activeId: string, overId: string): string[] {
	const from = ids.indexOf(activeId);
	const to = ids.indexOf(overId);
	if (from === -1 || to === -1) {
		return ids;
	}
	return arrayMove(ids, from, to);
}

export interface CanReorderInput {
	/** Active sort param, e.g. "title:asc"; undefined when unsorted. */
	sort?: string;
	hasActiveFilters: boolean;
	/** Active predefined tab name; undefined when none. */
	tab?: string;
	/** First declared tab name; undefined when the table has no tabs. */
	firstTabName?: string;
	/** Reorder column when reordering is enabled, else undefined. */
	reorderColumn?: string;
}

/**
 * Reorder is allowed only when the rows are shown in their persisted order:
 * reordering enabled, no sort (or sort == the reorder column asc), no active
 * filters/search, and the default (first) tab. A foreign sort or any filter
 * would make the drag target a position the persisted order can't honor.
 */
export function canReorder(input: CanReorderInput): boolean {
	if (!input.reorderColumn) {
		return false;
	}
	if (!isReorderSort(input.sort, input.reorderColumn)) {
		return false;
	}
	if (input.hasActiveFilters) {
		return false;
	}
	return isDefaultTab(input.tab, input.firstTabName);
}

function isReorderSort(sort: string | undefined, reorderColumn: string): boolean {
	return !sort || sort === `${reorderColumn}:asc`;
}

function isDefaultTab(tab: string | undefined, firstTabName: string | undefined): boolean {
	if (!tab) {
		return true;
	}
	return tab === firstTabName;
}
