import type { Select } from "../../dsl";

type Bag = Record<string, unknown>;
type Option = { value: string; label: string; display?: unknown };

const scalar = (v: unknown): v is string | number | boolean =>
	["string", "number", "boolean"].includes(typeof v);
const isBag = (v: unknown): v is Bag => v !== null && typeof v === "object" && !Array.isArray(v);

/** Only the declared dependsOn() keys, as strings: the bag is browser-supplied (DependencyPayload.php). */
export function readDeps(body: Bag, allowed: string[]): Record<string, string> {
	const deps = isBag(body.deps) ? body.deps : {};
	const out: Record<string, string> = {};
	for (const [key, value] of Object.entries(deps)) {
		if (allowed.includes(key) && scalar(value)) {
			out[key] = String(value);
		}
	}
	return out;
}

/**
 * select-options, three modes by body (SelectOptionsResponder.php): `{search}` → options,
 * `{value}` → option, `{values}` → options. Only allowlisted option keys reach the browser.
 */
export async function respondOptions(field: Select, body: Bag): Promise<unknown> {
	const deps = readDeps(body, field.dependsOnFields());
	if ("values" in body) {
		const rows = await callQuery(field, deps, "");
		const values = Array.isArray(body.values) ? body.values.filter(scalar) : [];
		return {
			options: await Promise.all(values.map((v) => resolveOne(field, rows, String(v)))),
		};
	}
	if ("value" in body) {
		const rows = await callQuery(field, deps, "");
		return {
			option: await resolveOne(field, rows, scalar(body.value) ? String(body.value) : ""),
		};
	}
	const search = scalar(body.search) ? String(body.search) : "";
	return { options: normalize(await callQuery(field, deps, search)) };
}

async function callQuery(
	field: Select,
	deps: Record<string, string>,
	search: string,
): Promise<Bag | unknown[]> {
	const query = field.queryClosure();
	const rows = query === undefined ? [] : await query(deps, search);
	return Array.isArray(rows) || isBag(rows) ? rows : [];
}

/** Keyed lookup only: a capped search result must not lend a neighbour's label. */
async function resolveOne(field: Select, rows: Bag | unknown[], value: string): Promise<Option> {
	const row = Array.isArray(rows)
		? rows.find((r) => isBag(r) && String(r.value) === value)
		: rows[value];
	const resolver = field.resolveClosure();
	const fromRows = asOption(row, value);
	const resolved = fromRows ?? asOption(resolver ? await resolver(value) : null, value);
	return { ...(resolved ?? { label: value }), value };
}

function asOption(raw: unknown, value: string): Omit<Option, "value"> | null {
	if (scalar(raw)) {
		return { label: String(raw) };
	}
	return isBag(raw) ? readOption(raw, value) : null;
}

function readOption(row: Bag, fallback: string): Omit<Option, "value"> {
	const label = scalar(row.label) ? String(row.label) : fallback;
	return isBag(row.display) ? { label, display: row.display } : { label };
}

function normalize(rows: Bag | unknown[]): Option[] {
	if (!Array.isArray(rows)) {
		return Object.entries(rows).flatMap(([value, label]) =>
			scalar(label) ? [{ value, label: String(label) }] : [],
		);
	}
	return rows.flatMap((row) => {
		if (!isBag(row) || !scalar(row.value)) {
			return [];
		}
		return [{ value: String(row.value), ...readOption(row, String(row.value)) }];
	});
}
