import { type Kysely, type SelectQueryBuilder, sql } from "kysely";
import type { Row } from "../dsl";
import type { Clause, QueryDriver } from "../server/driver";
import type { HostRule } from "../server/validation/validator";

/** Any select over the host schema; the driver only adds clauses to it. */
type Builder<DB> = SelectQueryBuilder<DB, keyof DB & string, object>;

const like = (text: string) => `%${text.replaceAll(/[%_\\]/g, (c) => `\\${c}`)}%`;

/**
 * A QueryDriver over Kysely. Field names arrive whitelisted against the
 * declared columns, so `dynamic.ref` never sees raw input.
 */
export function kyselyDriver<DB>(db: Kysely<DB>, keyName = "id"): QueryDriver<Builder<DB>> {
	const ref = (field: string) => db.dynamic.ref(field);
	// Explicit ESCAPE: SQLite has no default escape character for LIKE.
	const contains = (field: string, text: string) =>
		sql<boolean>`${ref(field)} like ${like(text)} escape '\\'`;
	const where = (qb: Builder<DB>, clause: Clause): Builder<DB> => {
		if (clause.op === "contains") {
			return qb.where(contains(clause.field, clause.value));
		}
		if (clause.op === "dateLte") {
			return qb.where(sql<boolean>`date(${ref(clause.field)}) <= ${clause.value}`);
		}
		return qb.where(ref(clause.field), clause.op, clause.value);
	};
	return {
		keyName,
		where,
		searchAny: (qb, fields, text) =>
			qb.where((eb) => eb.or(fields.map((f) => contains(f, text)))),
		orderBy: (qb, field, dir) => qb.orderBy(ref(field), dir),
		count: async (qb) => {
			const row = await qb
				.clearSelect()
				.select((eb) => eb.fn.countAll<number>().as("count"))
				.executeTakeFirst();
			return Number((row as { count?: unknown } | undefined)?.count ?? 0);
		},
		rows: async (qb, { page, perPage }) =>
			(await qb
				.selectAll()
				.limit(perPage)
				.offset((page - 1) * perPage)
				.execute()) as Row[],
		update: async (qb, key, values) => {
			// Untyped on purpose: the table name is only known at runtime.
			const untyped = db as unknown as Kysely<Record<string, Row>>;
			await untyped
				.updateTable(tableOf(qb))
				.set(values)
				.where(untyped.dynamic.ref(keyName), "=", key)
				.execute();
		},
	};
}

/** The FROM table of a select builder: reorder writes back to it. */
function tableOf<DB>(qb: Builder<DB>): string {
	const node = qb.toOperationNode().from?.froms[0] as
		| { table?: { identifier?: { name?: string } } }
		| undefined;
	const name = node?.table?.identifier?.name;
	if (name === undefined) {
		throw new Error("kyselyDriver: cannot find the table to update.");
	}
	return name;
}

/**
 * Laravel's `unique:table,column,except,idColumn` and `exists:table,column`
 * over Kysely, as host rules: `createAdmin({ hostRules: kyselyRules(db) })`.
 * Table and column names come from rule strings the developer wrote.
 */
export function kyselyRules<DB>(db: Kysely<DB>): Record<string, HostRule> {
	const untyped = db as unknown as Kysely<Record<string, Row>>;
	const count = async (
		table: string,
		where: [string, unknown[]][],
		except?: [string, string],
	) => {
		let qb = untyped.selectFrom(table).select((eb) => eb.fn.countAll<number>().as("count"));
		for (const [column, values] of where) {
			qb = qb.where(untyped.dynamic.ref(column), "in", values);
		}
		if (except !== undefined) {
			qb = qb.where(untyped.dynamic.ref(except[1]), "!=", except[0]);
		}
		return Number((await qb.executeTakeFirst())?.count ?? 0);
	};
	return {
		unique: {
			message: "The :attribute has already been taken.",
			check: async (value, [table = "", column, except, idColumn = "id"], key) => {
				const ignore = except === undefined || except === "NULL" ? undefined : except;
				const excluded =
					ignore === undefined ? undefined : ([ignore, idColumn] as [string, string]);
				return (await count(table, [[columnFor(column, key), [value]]], excluded)) === 0;
			},
		},
		exists: {
			message: "The selected :attribute is invalid.",
			check: async (value, [table = "", column], key) => {
				const values = [...new Set(Array.isArray(value) ? value : [value])];
				return (await count(table, [[columnFor(column, key), values]])) >= values.length;
			},
		},
	};
}

/** guessColumnForQuery(): the given column, else the key's last non-numeric segment. */
function columnFor(column: string | undefined, key: string): string {
	if (column !== undefined && column !== "NULL") {
		return column;
	}
	const last = key.split(".").at(-1) ?? key;
	return /^\d+$/.test(last) ? key : last;
}

export { type KyselyNotificationsOptions, kyselyNotifications } from "./kyselyNotifications";
