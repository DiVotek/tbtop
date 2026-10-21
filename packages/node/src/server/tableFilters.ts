import type { Field } from "../dsl";
import type { Clause, QueryDriver } from "./driver";

const EQUALITY_KINDS = ["select", "radio", "number", "date", "datetime", "time"];
const LIKE_KINDS = ["text", "textarea", "slug", "password"];

type Scalar = string | number | boolean;
const isScalar = (v: unknown): v is Scalar => ["string", "number", "boolean"].includes(typeof v);

/**
 * Declared filter fields only (TableFilterApplier.php): a table without
 * filters ignores the param instead of querying arbitrary columns.
 */
export function applyFilters<Q>(
	fields: Field[],
	values: Record<string, unknown>,
	on: { driver: QueryDriver<Q>; query: Q },
): Q {
	const { driver } = on;
	let q = on.query;
	for (const field of fields) {
		const value = values[field.name];
		if (isEmpty(value)) {
			continue;
		}
		const custom = field.filterClosure();
		q = custom
			? (custom(q, value) as Q)
			: clauses(field, value).reduce((acc, c) => driver.where(acc, c), q);
	}
	return q;
}

const isEmpty = (v: unknown) =>
	v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0);

type Mapping = (name: string, value: unknown) => Clause[];

/** A browser-sent array would 500 on a string term: like/boolean kinds ignore it. */
const like: Mapping = (name, value) =>
	isScalar(value) ? [{ field: name, op: "contains", value: String(value) }] : [];
const equality: Mapping = (name, value) =>
	Array.isArray(value) ? inClause(name, value) : [{ field: name, op: "=", value }];
const anyOf: Mapping = (name, value) => inClause(name, Array.isArray(value) ? value : [value]);

const MAPPINGS: Record<string, Mapping> = {
	...Object.fromEntries(LIKE_KINDS.map((kind) => [kind, like])),
	...Object.fromEntries(EQUALITY_KINDS.map((kind) => [kind, equality])),
	boolean: (name, value) =>
		isScalar(value) ? [{ field: name, op: "=", value: toBoolean(value) }] : [],
	tags: anyOf,
	in: anyOf,
	daterange: (name, value) => rangeClauses(name, value),
};

function clauses(field: Field, value: unknown): Clause[] {
	const mapping = MAPPINGS[field.kind];
	if (mapping === undefined) {
		throw new Error(
			`No default filter mapping for field kind "${field.kind}" (field "${field.name}"); add filterUsing().`,
		);
	}
	return mapping(field.name, value);
}

function inClause(field: string, values: unknown[]): Clause[] {
	const scalars = values.filter(isScalar);
	return scalars.length > 0 ? [{ field, op: "in", value: scalars }] : [];
}

function rangeClauses(field: string, value: unknown): Clause[] {
	if (value === null || typeof value !== "object") {
		return [];
	}
	const { from, to } = value as { from?: unknown; to?: unknown };
	const out: Clause[] = [];
	if (typeof from === "string" && from !== "") {
		out.push({ field, op: ">=", value: from });
	}
	if (typeof to === "string" && to !== "") {
		// Inclusive end day on datetime columns, like whereDate().
		out.push({ field, op: "dateLte", value: to });
	}
	return out;
}

function toBoolean(value: Scalar): boolean {
	return typeof value === "boolean"
		? value
		: ["1", "true", "yes"].includes(String(value).toLowerCase());
}

/** The value a filter takes, in words for an agent (TableFilterApplier::valueShape). */
export function filterValueShape(field: Field): string {
	if (field.filterClosure()) {
		return "custom filter: value is passed as-is to the page's closure";
	}
	const { kind } = field;
	if (LIKE_KINDS.includes(kind)) {
		return "string, matched as a substring";
	}
	if (EQUALITY_KINDS.includes(kind)) {
		return "exact value, or an array of values a row matches any of";
	}
	const shapes: Record<string, string> = {
		boolean: "boolean",
		tags: "array of values, a row matches any of them",
		in: "array of values, a row matches any of them",
		daterange: '{"from": "Y-m-d", "to": "Y-m-d"}, either bound optional',
	};
	return shapes[kind] ?? `unsupported kind "${kind}"`;
}
