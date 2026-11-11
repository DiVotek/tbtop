import { applyKindFormat, type Column, type Row, type Summary, type TableBuilder } from "../dsl";
import type { AggregateFn, QueryDriver } from "./driver";
import { dataGet } from "./validation/data";

export type SummaryValues = Record<string, unknown[]>;

/** The table, its driver and its filtered, unsorted query: what every summary runs on. */
export interface SummaryScope<Q> {
	table: TableBuilder<Q>;
	driver: QueryDriver<Q>;
	filtered: Q;
}

/**
 * Column.summarize() footer (TableSummaries.php): every summary over the
 * table's filtered, unsorted query, keyed by column name. Null when no visible
 * column summarizes.
 */
export async function footerSummaries<Q>(scope: SummaryScope<Q>): Promise<SummaryValues | null> {
	const columns = scope.table.summarizedColumns();
	if (columns.length === 0) {
		return null;
	}
	return summarize(columns, scope.driver, scope.filtered);
}

/**
 * Puts each row group's summaries on the first projected row of its run,
 * under `_groupSummary`, computed over the whole group (not just its rows on
 * this page). A table without groups() passes through.
 */
export async function attachGroupSummaries<Q>(
	scope: SummaryScope<Q>,
	rows: Row[],
	projected: Row[],
): Promise<Row[]> {
	const groupColumn = scope.table.getGroupsColumn();
	if (groupColumn === null) {
		return projected;
	}
	const columns = scope.table.summarizedColumns();
	const cache = new Map<string, SummaryValues>();
	for (const [i, row] of rows.entries()) {
		const value = dataGet(row, groupColumn) ?? null;
		if (i > 0 && sameGroup(dataGet(rows[i - 1] as Row, groupColumn) ?? null, value)) {
			continue;
		}
		const key = JSON.stringify(value);
		const narrowed = scope.driver.where(scope.filtered, { field: groupColumn, op: "=", value });
		const entry = cache.get(key) ?? (await summarize(columns, scope.driver, narrowed));
		cache.set(key, entry);
		(projected[i] as Row)._groupSummary = entry;
	}
	return projected;
}

async function summarize<Q>(
	columns: Column[],
	driver: QueryDriver<Q>,
	query: Q,
): Promise<SummaryValues> {
	const out: SummaryValues = {};
	for (const column of columns) {
		const values: unknown[] = [];
		for (const summary of column.st.summaries) {
			values.push(await one({ column, summary }, driver, query));
		}
		out[column.name] = values;
	}
	return out;
}

async function one<Q>(
	{ column, summary }: { column: Column; summary: Summary },
	driver: QueryDriver<Q>,
	query: Q,
): Promise<unknown> {
	if (summary.usingFn !== undefined) {
		return await (summary.usingFn as (q: Q) => unknown)(query);
	}
	if (summary.type === "count") {
		return await driver.count(query);
	}
	if (driver.aggregate === undefined) {
		throw new Error(
			`Column "${column.name}": Summary.${summary.type}() needs a query driver with aggregate().`,
		);
	}
	const raw = await driver.aggregate(query, summary.type as AggregateFn, column.name);
	return format(column, summary.type, raw);
}

/** Sum of nothing is 0; an average without a number/money format rounds to two decimals. */
function format(column: Column, type: string, raw: unknown): unknown {
	const value = numeric(type === "sum" ? (raw ?? 0) : (raw ?? null));
	const kind = column.st.kind ?? "";
	const rounds = type === "avg" && kind !== "number" && kind !== "money";
	const shown = rounds && typeof value === "number" ? Math.round(value * 100) / 100 : value;
	return applyKindFormat(kind, column.st.kindMeta, shown);
}

/** A numeric string (SQL drivers return SUM/AVG as one) becomes a number. */
function numeric(value: unknown): unknown {
	const isNumeric =
		typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value));
	return isNumeric ? Number(value) : value;
}

function sameGroup(a: unknown, b: unknown): boolean {
	return JSON.stringify(a) === JSON.stringify(b);
}
