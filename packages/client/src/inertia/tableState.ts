import type { ClientActionContext } from "../structure/types";
import { tableQueryParams } from "./materializeHelpers";

/**
 * The table's state without its page window — tab, search, sort, filters,
 * column search — as the query string its own fetch sends. The export
 * download and an all-matching bulk action both replay it on the server.
 */
export function tableStateSearch(ctx: ClientActionContext): URLSearchParams {
	const search = new URLSearchParams();
	for (const [key, value] of Object.entries(tableQueryParams(ctx))) {
		if (key !== "page" && key !== "perPage" && value !== undefined && value !== null) {
			search.append(key, String(value));
		}
	}
	return search;
}

/**
 * Which table the selection came from, so the server can resolve it against
 * that table's query: every matching row when `all`, replaying `query`.
 */
export function bulkPayload(ctx: ClientActionContext): Record<string, unknown> | undefined {
	const table = ctx.table;
	if (!table?.name) {
		return undefined;
	}
	const all = table.allMatching === true;
	return all
		? { table: table.name, all, query: tableStateSearch(ctx).toString() }
		: { table: table.name, all };
}
