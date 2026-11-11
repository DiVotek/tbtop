import type { ActionCtx, TableBuilder } from "../dsl";
import { keyOf, type QueryDriver } from "./driver";
import { trimInput } from "./endpoints/input";
import { type EndpointCtx, requireDriver } from "./endpoints/types";
import { phpQuery, unprocessable } from "./http";
import { applyTableState } from "./tableQuery";

type Bag = Record<string, unknown>;

const PLUCK_CHUNK = 1000;

/**
 * A bulk action's selection resolved against its table (BulkSelection.php).
 *
 * `payload.bulk = {table, all, query}` names the table the action ran from.
 * With `all` the user picked every row matching the table's state, so
 * `query` (the table's own query string) is replayed through the table
 * query and `selection` becomes every matching key — existing handlers over
 * `ctx.selection` keep working. Either way `ctx.records()` is the table's
 * query narrowed to the selection. Only a table whose bulk actions hold the
 * action may scope it: anything else is ignored for keys, refused for all.
 */
export async function withBulkSelection(
	ctx: EndpointCtx,
	action: { name: string; payload: Bag },
	base: ActionCtx,
): Promise<ActionCtx> {
	const actionName = action.name;
	const bulk = action.payload.bulk as Bag | undefined;
	if (bulk === null || typeof bulk !== "object" || typeof bulk.table !== "string") {
		return base;
	}
	const all = bulk.all === true;
	const table = ctx.resolved.s.reachableTable(bulk.table);
	const query = table?.queryClosure();
	if (table === null || query === undefined || !table.hasBulkAction(actionName)) {
		if (all) {
			throw unprocessable(
				`Action "${actionName}" cannot act on all rows of table "${bulk.table}".`,
			);
		}
		return base;
	}
	const driver = requireDriver(ctx.options);
	if (!all) {
		const keys = base.selection;
		return base.withRecords(keys, false, () =>
			driver.where(query(), { field: keyOf(driver), op: "in", value: keys }),
		);
	}
	const params = trimInput(state(bulk.query), ctx.options);
	const records = () =>
		applyTableState({ table: table as TableBuilder, params, driver }, query());
	return base.withRecords(await pluckKeys(driver, records()), true, records);
}

/** The table state from its query string, without the page window. */
function state(raw: unknown): Bag {
	if (typeof raw !== "string" || raw === "") {
		return {};
	}
	const { page: _page, perPage: _perPage, ...rest } = phpQuery(new URLSearchParams(raw));
	return rest;
}

const isKey = (value: unknown): value is string | number =>
	typeof value === "string" || typeof value === "number";

/** Every key of `query`, read page by page in the key's order. */
async function pluckKeys<Q>(driver: QueryDriver<Q>, query: Q): Promise<(string | number)[]> {
	const key = keyOf(driver as QueryDriver);
	const ordered = driver.orderBy(query, key, "asc");
	const keys: (string | number)[] = [];
	for (let page = 1; ; page++) {
		const rows = await driver.rows(ordered, { page, perPage: PLUCK_CHUNK });
		keys.push(...rows.map((row) => row[key]).filter(isKey));
		if (rows.length < PLUCK_CHUNK) {
			return keys;
		}
	}
}
