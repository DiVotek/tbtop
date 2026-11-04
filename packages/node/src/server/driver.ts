import type { Row } from "../dsl";

export type Clause =
	| { field: string; op: "=" | ">=" | "<="; value: unknown }
	| { field: string; op: "in"; value: unknown[] }
	| { field: string; op: "contains"; value: string }
	| { field: string; op: "dateLte"; value: string };

/**
 * What the server asks of the host's query type `Q` (Eloquent's role in PHP).
 * Every step returns a new `Q`, so an immutable builder (Kysely, Drizzle) fits
 * as-is. Field names reaching it are whitelisted against the declared columns.
 */
export interface QueryDriver<Q = unknown> {
	/** One condition, ANDed onto the query. */
	where(query: Q, clause: Clause): Q;
	/** The union search: any of `fields` contains `text`. */
	searchAny(query: Q, fields: string[], text: string): Q;
	orderBy(query: Q, field: string, dir: "asc" | "desc"): Q;
	count(query: Q): Promise<number>;
	/** One page of rows; `page` starts at 1. */
	rows(query: Q, window: { page: number; perPage: number }): Promise<Row[]>;
	/** Writes `values` to the row with this key (reorder). */
	update(query: Q, key: string | number, values: Row): Promise<void>;
	/** The record key column; `id` when omitted. */
	keyName?: string;
}

export function keyOf(driver: QueryDriver): string {
	return driver.keyName ?? "id";
}
