import { type Kysely, type SelectQueryBuilder, sql } from "kysely";
import type { RowSource, TableQuery } from "../table";

type Builder<DB, TB extends keyof DB> = SelectQueryBuilder<DB, TB, object>;

export interface KyselyRowsOptions<DB, TB extends keyof DB> {
	/** Base scope every request starts from (PHP: `->query(fn () => Post::query()->where(...))`). */
	scope?: (qb: Builder<DB, TB>) => Builder<DB, TB>;
}

/**
 * A table row source over Kysely. Sort and search columns arrive already
 * whitelisted against the declared columns, so `dynamic.ref` never sees raw input.
 */
export function kyselyRows<DB, TB extends keyof DB & string>(
	db: Kysely<DB>,
	table: TB,
	options: KyselyRowsOptions<DB, TB> = {},
): RowSource {
	return async (query) => {
		const base = filtered(db, scoped(db, table, options), query);
		const counted = (await base
			.select((eb) => eb.fn.countAll<number>().as("count"))
			.executeTakeFirst()) as { count?: number | string | bigint } | undefined;
		const rows = await page(db, base, query).selectAll().execute();
		return { rows: rows as Record<string, unknown>[], total: Number(counted?.count ?? 0) };
	};
}

function scoped<DB, TB extends keyof DB & string>(
	db: Kysely<DB>,
	table: TB,
	options: KyselyRowsOptions<DB, TB>,
): Builder<DB, TB> {
	const qb = db.selectFrom(table as never) as unknown as Builder<DB, TB>;
	return options.scope ? options.scope(qb) : qb;
}

function filtered<DB, TB extends keyof DB>(
	db: Kysely<DB>,
	qb: Builder<DB, TB>,
	query: TableQuery,
): Builder<DB, TB> {
	const search = query.search;
	if (!search) {
		return qb;
	}
	const pattern = `%${search.text.replaceAll(/[%_\\]/g, (c) => `\\${c}`)}%`;
	// Explicit ESCAPE: SQLite has no default escape character for LIKE.
	return qb.where((eb) =>
		eb.or(
			search.fields.map(
				(f) => sql<boolean>`${db.dynamic.ref(f)} like ${pattern} escape '\\'`,
			),
		),
	) as Builder<DB, TB>;
}

function page<DB, TB extends keyof DB>(
	db: Kysely<DB>,
	qb: Builder<DB, TB>,
	query: TableQuery,
): Builder<DB, TB> {
	const sorted = query.sort ? qb.orderBy(db.dynamic.ref(query.sort.field), query.sort.dir) : qb;
	return sorted.limit(query.perPage).offset((query.page - 1) * query.perPage) as Builder<DB, TB>;
}
