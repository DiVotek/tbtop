import { applyKindFormat, type Column, type Row, type Summary, type TableBuilder } from "../dsl";
import type { AggregateFn, Clause, QueryDriver } from "./driver";
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
 * this page). Runs follow the projected value, the way the client partitions
 * rows, so a formatted group column keeps one subtotal per displayed group,
 * over the stored values shown alike. A table without groups() passes through.
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
	for (const [start, values] of groupRuns(rows, projected, groupColumn)) {
		const narrowed = scope.driver.where(scope.filtered, groupClause(groupColumn, values));
		(projected[start] as Row)._groupSummary = await summarize(columns, scope.driver, narrowed);
	}
	return projected;
}

/** First row index of each displayed run => the distinct raw values in it. */
function groupRuns(rows: Row[], projected: Row[], column: string): Map<number, unknown[]> {
	const runs = new Map<number, unknown[]>();
	let start = 0;
	for (const [i, row] of rows.entries()) {
		const shown = dataGet(projected[i] as Row, column);
		if (i === 0 || !Object.is(shown, dataGet(projected[i - 1] as Row, column))) {
			start = i;
			runs.set(start, []);
		}
		const raw = dataGet(row, column) ?? null;
		const values = runs.get(start) as unknown[];
		if (!values.some((v) => sameGroup(v, raw))) {
			values.push(raw);
		}
	}
	return runs;
}

/** One stored value narrows with `=`, several shown alike with `in`; both null-safe. */
function groupClause(field: string, values: unknown[]): Clause {
	return values.length === 1
		? { field, op: "=", value: values[0] }
		: { field, op: "in", value: values };
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

/** Sum of nothing is 0; an average rounds to two decimals unless money() or number(decimals) formats it. */
function format(column: Column, type: string, raw: unknown): unknown {
	const kind = column.st.kind ?? "";
	const stored = type === "sum" ? (raw ?? 0) : (raw ?? null);
	const value = coerces(type, kind) ? numeric(stored) : stored;
	const rounds = type === "avg" && kind !== "money" && column.st.kindMeta.decimals === undefined;
	const shown = rounds && typeof value === "number" ? Math.round(value * 100) / 100 : value;
	return applyKindFormat(kind, column.st.kindMeta, shown);
}

/** SQL returns SUM/AVG as strings; a text min/max like "007" stays as stored. */
function coerces(type: string, kind: string): boolean {
	return ["sum", "avg"].includes(type) || ["number", "money"].includes(kind);
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
