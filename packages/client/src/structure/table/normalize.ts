/**
 * Pure helpers for reading the table query response + sort param.
 * No JSX — kept separate from the grid render code.
 */

/**
 * The row's record key. The server sends it as `_key`, which no column can
 * overwrite; `id` is the fallback for rows from a consumer's own endpoint.
 */
export function readId(row: Record<string, unknown>): string | undefined {
	return keyString(row._key) ?? keyString(row.id);
}

function keyString(id: unknown): string | undefined {
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

interface NormalizedRows {
	rows: Record<string, unknown>[];
	total: number | undefined;
	/** Sent instead of total by a simple-paginated table. */
	hasMore: boolean | undefined;
	tabCounts: Record<string, number> | undefined;
	/** Footer summaries by column name, one value per declared summary. */
	summaries: SummaryValues | undefined;
}

export type SummaryValues = Record<string, unknown[]>;

export function normalizeRows(data: unknown): NormalizedRows {
	const empty = {
		total: undefined,
		hasMore: undefined,
		tabCounts: undefined,
		summaries: undefined,
	};
	if (Array.isArray(data)) {
		return { ...empty, rows: data as Record<string, unknown>[] };
	}
	if (data && typeof data === "object") {
		const obj = data as {
			data?: unknown;
			total?: unknown;
			hasMore?: unknown;
			tabCounts?: unknown;
			summaries?: unknown;
		};
		if (Array.isArray(obj.data)) {
			return {
				rows: obj.data as Record<string, unknown>[],
				total: typeof obj.total === "number" ? obj.total : undefined,
				hasMore: typeof obj.hasMore === "boolean" ? obj.hasMore : undefined,
				tabCounts: readTabCounts(obj.tabCounts),
				summaries: readSummaryValues(obj.summaries),
			};
		}
	}
	return { ...empty, rows: [] };
}

/** A `summaries` map (footer) or a row's `_groupSummary`: column name → values. */
export function readSummaryValues(value: unknown): SummaryValues | undefined {
	if (typeof value !== "object" || value === null || Array.isArray(value)) {
		return undefined;
	}
	const out: SummaryValues = {};
	for (const [name, values] of Object.entries(value as Record<string, unknown>)) {
		if (Array.isArray(values)) {
			out[name] = values;
		}
	}
	return out;
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
