/**
 * URL persistence helpers for table query state.
 *
 * Encoding: each table is namespaced under `t[<name>]` in the query string so
 * multiple tables on one page never clobber each other.
 *
 * Examples:
 *   t[posts][search]=hello
 *   t[posts][sort]=title%3Adesc   (sort:dir encoded as a single param)
 *   t[posts][page]=2
 *   t[posts][status]=draft        (filter field "status")
 *   t[posts][created_at][from]=2024-01-01  (daterange filter)
 *
 * Empty / default values are omitted: `t[posts][search]=` does not appear.
 */

import { readFilters, writeFilterValue, writeScalar } from "./tableUrlStateHelpers";
import type { ListQueryParams } from "./types";

// Prefix used to namespace table state in the URL.
const URL_NS = "t";

// ─── serialise ───────────────────────────────────────────────────────────────

/**
 * Writes `params` for table `name` into a copy of `searchParams`.
 * All existing keys for that table are removed first, then only
 * non-default values are written back.
 */
export function writeTableParams(
	searchParams: URLSearchParams,
	name: string,
	params: ListQueryParams,
): URLSearchParams {
	const next = new URLSearchParams(searchParams);
	clearTableKeys(next, name);
	writeScalar({ params: next, name, key: "search", value: params.search });
	writeScalar({ params: next, name, key: "sort", value: params.sort });
	writeScalar({
		params: next,
		name,
		key: "page",
		value: params.page !== undefined ? String(params.page) : undefined,
	});
	writeScalar({
		params: next,
		name,
		key: "perPage",
		value: params.perPage !== undefined ? String(params.perPage) : undefined,
	});
	for (const [field, value] of Object.entries(params.filters ?? {})) {
		writeFilterValue({ params: next, name, field, value });
	}
	return next;
}

// ─── deserialise ─────────────────────────────────────────────────────────────

/**
 * Reads the table-scoped params for `name` out of `searchParams`.
 * Returns undefined for all absent / empty keys.
 */
export function readTableParams(searchParams: URLSearchParams, name: string): ListQueryParams {
	const prefix = `${URL_NS}[${name}]`;
	const params: ListQueryParams = {};

	const search = searchParams.get(`${prefix}[search]`);
	if (search) {
		params.search = search;
	}

	const sort = searchParams.get(`${prefix}[sort]`);
	if (sort) {
		params.sort = sort;
	}

	const page = searchParams.get(`${prefix}[page]`);
	if (page) {
		const n = Number(page);
		if (Number.isFinite(n) && n > 0) {
			params.page = n;
		}
	}

	const perPage = searchParams.get(`${prefix}[perPage]`);
	if (perPage) {
		const n = Number(perPage);
		if (Number.isFinite(n) && n > 0) {
			params.perPage = n;
		}
	}

	const filters = readFilters(searchParams, name, prefix);
	if (Object.keys(filters).length > 0) {
		params.filters = filters;
	}

	return params;
}

// ─── history integration ─────────────────────────────────────────────────────

/**
 * Calls `history.replaceState` to mirror `params` for table `name` into the
 * current URL without triggering a navigation.
 */
export function persistTableParams(name: string, params: ListQueryParams): void {
	if (typeof window === "undefined") {
		return;
	}
	const next = writeTableParams(new URLSearchParams(window.location.search), name, params);
	const qs = next.toString();
	const url = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
	window.history.replaceState(window.history.state, "", url);
}

/**
 * Reads the initial query params for table `name` from the current URL.
 * Returns `{}` when the URL carries no state for this table.
 */
export function seedTableParams(name: string): ListQueryParams {
	if (typeof window === "undefined") {
		return {};
	}
	return readTableParams(new URLSearchParams(window.location.search), name);
}

// ─── internal helpers ─────────────────────────────────────────────────────────

function clearTableKeys(params: URLSearchParams, name: string): void {
	const prefix = `${URL_NS}[${name}]`;
	const toDelete: string[] = [];
	for (const key of params.keys()) {
		if (key.startsWith(prefix)) {
			toDelete.push(key);
		}
	}
	for (const key of toDelete) {
		params.delete(key);
	}
}
