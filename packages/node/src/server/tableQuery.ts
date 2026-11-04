import type { Row, TableBuilder } from "../dsl";
import { keyOf, type QueryDriver } from "./driver";
import { unprocessable } from "./http";
import { projectRows } from "./projection";
import { applyFilters } from "./tableFilters";

export interface TablePage {
	data: Row[];
	/** Absent under simplePagination(), which answers `hasMore` instead. */
	total?: number;
	hasMore?: boolean;
	page: number;
	perPage: number;
	tabCounts?: Record<string, number>;
}

const text = (v: unknown): string =>
	typeof v === "string" || typeof v === "number" ? String(v).trim() : "";

interface Step<Q> {
	table: TableBuilder<Q>;
	params: Record<string, unknown>;
	driver: QueryDriver<Q>;
}

/** One table page (TableQuery.php): tab → search → column search → filters → sort → window. */
export async function runTable<Q>(
	table: TableBuilder<Q>,
	params: Record<string, unknown>,
	driver: QueryDriver<Q>,
): Promise<TablePage> {
	const base = table.queryClosure();
	if (base === undefined) {
		throw new Error(`Table "${table.name}" has no query.`);
	}
	const step = { table, params, driver };
	const filtered = applyFilters(table.filterFields(), record(params.filters), {
		driver,
		query: applySearch(step, applyTab(table, params.tab, base())),
	});
	const query = applySort(step, filtered);
	const { page, perPage } = pageWindow(table, params);
	const rows = await driver.rows(query, { page, perPage });
	const result: TablePage = {
		data: projectRows(table as TableBuilder, rows, keyOf(driver as QueryDriver)),
		...(table.isSimplePagination()
			? { hasMore: await hasMore(driver, query, { page, perPage, got: rows.length }) }
			: { total: await driver.count(query) }),
		page,
		perPage,
	};
	const tabCounts = await countTabs(table, driver, base);
	return tabCounts === null ? result : { ...result, tabCounts };
}

function pageWindow<Q>(table: TableBuilder<Q>, params: Record<string, unknown>) {
	const { perPage: fallback, options } = table.paginationSpec();
	const requested = Number(params.perPage ?? fallback);
	return {
		perPage: options.includes(requested) ? requested : fallback,
		page: Math.max(Math.trunc(Number(params.page ?? 1)) || 1, 1),
	};
}

/**
 * simplePagination(): whether a row exists past this page, without count().
 * A short page answers on its own; a full one probes the first row of the
 * next page (`LIMIT 1 OFFSET page * perPage`), which needs no driver change.
 */
async function hasMore<Q>(
	driver: QueryDriver<Q>,
	query: Q,
	{ page, perPage, got }: { page: number; perPage: number; got: number },
): Promise<boolean> {
	if (got < perPage) {
		return false;
	}
	const next = await driver.rows(query, { page: page * perPage + 1, perPage: 1 });
	return next.length > 0;
}

/** Counts per count-enabled tab, each on a fresh query with only its scope. */
async function countTabs<Q>(table: TableBuilder<Q>, driver: QueryDriver<Q>, base: () => Q) {
	const tabs = table.tabObjects().filter((t) => t.hasCount());
	if (tabs.length === 0) {
		return null;
	}
	const counts: Record<string, number> = {};
	for (const tab of tabs) {
		const scope = tab.queryClosure();
		counts[tab.name] = await driver.count(scope ? scope(base()) : base());
	}
	return counts;
}

function applyTab<Q>(table: TableBuilder<Q>, requested: unknown, query: Q): Q {
	const name = text(requested);
	const tab = name === "" ? table.defaultTab() : table.findTab(name);
	if (tab === null && name !== "") {
		throw unprocessable(`Unknown tab "${name}" for table "${table.name}".`);
	}
	const scope = tab?.queryClosure();
	return scope ? scope(query) : query;
}

function applySearch<Q>({ table, params, driver }: Step<Q>, query: Q): Q {
	let q = query;
	const search = text(params.search);
	const fields = table.searchableFields();
	if (search !== "" && fields.length > 0) {
		q = driver.searchAny(q, fields, search);
	}
	// Per-column search: each declared column narrows independently (AND).
	const allowed = table.individuallySearchableColumns();
	const terms = Object.entries(record(params.colSearch)).filter(
		([f, v]) => allowed.includes(f) && text(v) !== "",
	);
	return terms.reduce(
		(acc, [field, value]) => driver.where(acc, { field, op: "contains", value: text(value) }),
		q,
	);
}

/** Only declared sortable columns, plus the default-sort field (TableSortApplier.php). */
function applySort<Q>({ table, params, driver }: Step<Q>, query: Q): Q {
	const sort = requestedSort(table, params) ?? table.defaultSortSpec();
	if (sort === null) {
		return query;
	}
	const column = table.findColumn(sort.field);
	const sortUsing = column?.st.sortUsing as ((q: Q, d: "asc" | "desc") => Q) | undefined;
	return sortUsing
		? sortUsing(query, sort.dir)
		: driver.orderBy(query, column?.st.sortBy ?? sort.field, sort.dir);
}

function requestedSort<Q>(table: TableBuilder<Q>, params: Record<string, unknown>) {
	const field = text(params.sort);
	const allowed =
		table.sortableColumnNames().includes(field) || field === table.defaultSortSpec()?.field;
	if (field === "" || !allowed) {
		return null;
	}
	return { field, dir: params.dir === "desc" ? ("desc" as const) : ("asc" as const) };
}

function record(value: unknown): Record<string, unknown> {
	return value !== null && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};
}
