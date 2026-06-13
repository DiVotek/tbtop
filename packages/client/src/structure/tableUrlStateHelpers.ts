/** Internal write/read helpers for tableUrlState.ts. */

const URL_NS = "t";

export type WriteScalarInput = {
	params: URLSearchParams;
	name: string;
	key: string;
	value: string | undefined;
};

export function writeScalar({ params, name, key, value }: WriteScalarInput): void {
	if (!value) {
		return;
	}
	params.set(`${URL_NS}[${name}][${key}]`, value);
}

export type WriteFilterValueInput = {
	params: URLSearchParams;
	name: string;
	field: string;
	value: unknown;
};

export function writeFilterValue({ params, name, field, value }: WriteFilterValueInput): void {
	const fp = `${URL_NS}[${name}][${field}]`;
	if (value === null || value === undefined || value === "") {
		return;
	}
	if (Array.isArray(value)) {
		writeArrayFilter(params, fp, value);
		return;
	}
	if (typeof value === "object") {
		writeObjectFilter(params, fp, value as Record<string, unknown>);
		return;
	}
	params.set(fp, String(value));
}

function writeArrayFilter(params: URLSearchParams, prefix: string, arr: unknown[]): void {
	for (const [i, v] of arr.entries()) {
		if (v !== null && v !== undefined && v !== "") {
			params.set(`${prefix}[${i}]`, String(v));
		}
	}
}

function writeObjectFilter(
	params: URLSearchParams,
	prefix: string,
	obj: Record<string, unknown>,
): void {
	for (const [k, v] of Object.entries(obj)) {
		if (v !== null && v !== undefined && v !== "") {
			params.set(`${prefix}[${k}]`, String(v));
		}
	}
}

export function readFilters(
	params: URLSearchParams,
	name: string,
	prefix: string,
): Record<string, unknown> {
	const filters: Record<string, unknown> = {};
	const reserved = new Set(["search", "sort", "page", "perPage", "tab"]);
	const scalarRe = new RegExp(`^${escapeRegex(prefix)}\\[([^\\]]+)\\]$`);
	const nestedRe = new RegExp(`^${escapeRegex(prefix)}\\[([^\\]]+)\\]\\[([^\\]]+)\\]$`);

	for (const [key, value] of params.entries()) {
		if (!key.startsWith(prefix)) {
			continue;
		}
		const nested = nestedRe.exec(key);
		if (nested) {
			applyNestedFilter(filters, nested, value);
			continue;
		}
		applyScalarFilter({ filters, scalarRe, key, value, reserved });
	}
	return filters;
}

function applyNestedFilter(
	filters: Record<string, unknown>,
	match: RegExpExecArray,
	value: string,
): void {
	const [, field, sub] = match;
	if (!field || !sub) {
		return;
	}
	const idx = Number(sub);
	if (Number.isFinite(idx) && String(idx) === sub) {
		const arr = (filters[field] as unknown[] | undefined) ?? [];
		arr[idx] = value;
		filters[field] = arr;
	} else {
		const obj = (filters[field] as Record<string, unknown> | undefined) ?? {};
		obj[sub] = value;
		filters[field] = obj;
	}
}

type ApplyScalarFilterInput = {
	filters: Record<string, unknown>;
	scalarRe: RegExp;
	key: string;
	value: string;
	reserved: Set<string>;
};

function applyScalarFilter({
	filters,
	scalarRe,
	key,
	value,
	reserved,
}: ApplyScalarFilterInput): void {
	const scalar = scalarRe.exec(key);
	if (!scalar) {
		return;
	}
	const [, field] = scalar;
	if (!field || reserved.has(field)) {
		return;
	}
	if (value) {
		filters[field] = value;
	}
}

function escapeRegex(s: string): string {
	return s.replaceAll(/[[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}
