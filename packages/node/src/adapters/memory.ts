import type { Row } from "../dsl";
import type { Clause, QueryDriver } from "../server/driver";

/** An in-memory query: the source rows plus the steps applied so far. */
export interface MemoryQuery {
	readonly source: () => Row[];
	readonly filters: readonly ((row: Row) => boolean)[];
	readonly sorts: readonly { field: string; dir: "asc" | "desc" }[];
}

export function memoryQuery(source: () => Row[]): MemoryQuery {
	return { source, filters: [], sorts: [] };
}

const MATCHERS: Record<Clause["op"], (cell: unknown, value: unknown) => boolean> = {
	"=": (cell, value) => String(cell) === String(value),
	">=": (cell, value) => String(cell) >= String(value),
	"<=": (cell, value) => String(cell) <= String(value),
	in: (cell, value) => (value as unknown[]).map(String).includes(String(cell)),
	contains: (cell, value) =>
		String(cell ?? "")
			.toLowerCase()
			.includes(String(value).toLowerCase()),
	dateLte: (cell, value) => String(cell).slice(0, 10) <= String(value),
};

function narrowed(query: MemoryQuery, filter: (row: Row) => boolean): MemoryQuery {
	return { ...query, filters: [...query.filters, filter] };
}

function run(query: MemoryQuery): Row[] {
	const rows = query.source().filter((row) => query.filters.every((f) => f(row)));
	for (const { field, dir } of [...query.sorts].reverse()) {
		const sign = dir === "desc" ? -1 : 1;
		rows.sort((a, b) => sign * compare(a[field], b[field]));
	}
	return rows;
}

function compare(a: unknown, b: unknown): number {
	if (typeof a === "number" && typeof b === "number") {
		return a - b;
	}
	return String(a ?? "").localeCompare(String(b ?? ""));
}

/** A QueryDriver over plain arrays: tests, demos, and the reference for real drivers. */
export function memoryDriver(keyName = "id"): QueryDriver<MemoryQuery> {
	return {
		keyName,
		where: (query, clause) =>
			narrowed(query, (row) => MATCHERS[clause.op](row[clause.field], clause.value)),
		searchAny: (query, fields, text) =>
			narrowed(query, (row) => fields.some((f) => MATCHERS.contains(row[f], text))),
		orderBy: (query, field, dir) => ({ ...query, sorts: [...query.sorts, { field, dir }] }),
		count: async (query) => run(query).length,
		rows: async (query, { page, perPage }) =>
			run(query).slice((page - 1) * perPage, page * perPage),
		update: async (query, key, values) => {
			const row = run(query).find((r) => String(r[keyName]) === String(key));
			Object.assign(row ?? {}, values);
		},
	};
}
