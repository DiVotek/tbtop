import type { Table, TableQuery } from "./table";

/** Whitelists sort/search against the declared columns (TableQuery.php): the host never sees raw input. */
export function tableQuery(table: Table, q: URLSearchParams): TableQuery {
	const { perPage: defaultPerPage, options } = table.pagination();
	const requested = Number(q.get("perPage") ?? defaultPerPage);
	const text = q.get("search")?.trim();
	return {
		page: Math.max(Number(q.get("page") ?? 1) || 1, 1),
		perPage: options.includes(requested) ? requested : defaultPerPage,
		sort: sortOf(table, q),
		search: text ? { text, fields: table.searchableFields() } : undefined,
		filters: {},
		tab: q.get("tab") ?? undefined,
	};
}

function sortOf(table: Table, q: URLSearchParams): TableQuery["sort"] {
	const field = q.get("sort");
	if (!field || !table.sortableFields().includes(field)) {
		return table.defaultSortSpec();
	}
	return { field, dir: q.get("dir") === "desc" ? "desc" : "asc" };
}

/** Only declared columns reach the browser, plus `_key` (ColumnProjection.php). */
export function project(table: Table, row: Record<string, unknown>): Record<string, unknown> {
	const out: Record<string, unknown> = { _key: table.recordKey(row) };
	for (const col of table.getColumns()) {
		const value = row[col.name];
		out[col.name] = col.formatter ? col.formatter(value, row) : value;
	}
	return out;
}
