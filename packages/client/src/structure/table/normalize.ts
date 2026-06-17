/**
 * Pure helpers for reading the table query response + sort param.
 * No JSX — kept separate from the grid render code.
 */

export function readId(row: Record<string, unknown>): string | undefined {
	const id = row.id;
	if (typeof id === "string") {
		return id;
	}
	if (typeof id === "number" && Number.isFinite(id)) {
		return String(id);
	}
	return undefined;
}

export function isSelected(selectedIds: string[], row: Record<string, unknown>): boolean {
	const id = readId(row);
	return id ? selectedIds.includes(id) : false;
}

export function normalizeRows(data: unknown): {
	rows: Record<string, unknown>[];
	total: number | undefined;
	tabCounts: Record<string, number> | undefined;
} {
	if (Array.isArray(data)) {
		return { rows: data as Record<string, unknown>[], total: undefined, tabCounts: undefined };
	}
	if (data && typeof data === "object") {
		const obj = data as { data?: unknown; total?: unknown; tabCounts?: unknown };
		if (Array.isArray(obj.data)) {
			const total = typeof obj.total === "number" ? obj.total : undefined;
			return {
				rows: obj.data as Record<string, unknown>[],
				total,
				tabCounts: readTabCounts(obj.tabCounts),
			};
		}
	}
	return { rows: [], total: undefined, tabCounts: undefined };
}

function readTabCounts(value: unknown): Record<string, number> | undefined {
	if (typeof value !== "object" || value === null || Array.isArray(value)) {
		return undefined;
	}
	const counts: Record<string, number> = {};
	for (const [name, count] of Object.entries(value as Record<string, unknown>)) {
		if (typeof count === "number") {
			counts[name] = count;
		}
	}
	return counts;
}

export function parseSortParam(sort?: string): { col: string; dir: "asc" | "desc" } | undefined {
	if (!sort) {
		return undefined;
	}
	const [col, dir] = sort.split(":");
	if (!col) {
		return undefined;
	}
	return { col, dir: dir === "desc" ? "desc" : "asc" };
}
