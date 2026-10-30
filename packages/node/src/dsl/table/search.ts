import type { Column } from "./column";

/** Table-level search fields plus every visible searchable column, groups unfolded. */
export function searchableNames(tableLevel: string[], visible: Column[]): string[] {
	return [...new Set([...tableLevel, ...visible.flatMap(namesFor)])];
}

function namesFor(col: Column): string[] {
	const children = col.groupColumns();
	if (children.length === 0) {
		return col.isSearchable() ? [col.name] : [];
	}
	if (col.isSearchable()) {
		return children.map((child) => child.name);
	}
	return children.filter((child) => child.isSearchable()).map((child) => child.name);
}
