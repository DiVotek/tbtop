import { isSafeKey, own } from "../safeKeys";

/** Laravel's dot-path helpers over a decoded JSON body (Arr::get/has/set, wildcard expansion). */
type Bag = Record<string, unknown>;

function child(value: unknown, segment: string): { found: boolean; value: unknown } {
	if (value === null || typeof value !== "object" || !Object.hasOwn(value, segment)) {
		return { found: false, value: undefined };
	}
	return { found: true, value: (value as Bag)[segment] };
}

export function dataHas(data: unknown, key: string): boolean {
	let current: unknown = data;
	for (const segment of key.split(".")) {
		const next = child(current, segment);
		if (!next.found) {
			return false;
		}
		current = next.value;
	}
	return true;
}

export function dataGet(data: unknown, key: string): unknown {
	let current: unknown = data;
	for (const segment of key.split(".")) {
		current = child(current, segment).value;
	}
	return current ?? null;
}

/** Writes `value` at a dot path, creating arrays for numeric segments. */
export function dataSet(target: Bag, key: string, value: unknown): void {
	const segments = key.split(".");
	if (!segments.every(isSafeKey)) {
		return;
	}
	let current = target;
	for (const [i, segment] of segments.slice(0, -1).entries()) {
		const next = own(current, segment);
		current = (
			next !== null && typeof next === "object"
				? next
				: (current[segment] = /^\d+$/.test(segments[i + 1] ?? "") ? [] : {})
		) as Bag;
	}
	current[segments.at(-1) ?? key] = value;
}

/** `sections.*.heading` → the concrete keys present in the data. */
export function expandKey(data: unknown, key: string): string[] {
	const star = key.indexOf("*");
	if (star === -1) {
		return [key];
	}
	const head = key.slice(0, Math.max(star - 1, 0));
	const tail = key.slice(star + 1);
	const container = head === "" ? data : dataGet(data, head);
	if (container === null || typeof container !== "object") {
		return [];
	}
	const prefix = head === "" ? "" : `${head}.`;
	return Object.keys(container)
		.filter(isSafeKey)
		.flatMap((k) => expandKey(data, `${prefix}${k}${tail}`));
}

/** Laravel's ConvertEmptyStringsToNull, so `required` means the same on both stacks. */
export function emptyToNull(value: unknown): unknown {
	if (value === "") {
		return null;
	}
	if (Array.isArray(value)) {
		return value.map(emptyToNull);
	}
	if (value !== null && typeof value === "object") {
		return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, emptyToNull(v)]));
	}
	return value;
}

/** Keys TrimStrings never trims (Laravel's `TrimStrings::$neverTrim`). */
export const NEVER_TRIM = ["current_password", "password", "password_confirmation"];

/** Laravel's `Str::trim`: whitespace plus BOM, zero-width space and LTR mark. */
const EDGES = /^[\s﻿​‎]+|[\s﻿​‎]+$/g;

/** A Lexical editor state: a richtext value, whose text nodes keep their spacing. */
function isEditorState(value: object): boolean {
	const root = (value as Bag).root;
	return root !== null && typeof root === "object" && (root as Bag).type === "root";
}

/** `except` entries match a key path by its tail: `password` at any depth, `*` any segment. */
function excepted(path: string[], except: string[]): boolean {
	return except.some((entry) => {
		const tail = entry.split(".");
		const at = path.slice(-tail.length);
		return at.length === tail.length && tail.every((s, i) => s === "*" || s === at[i]);
	});
}

/**
 * Laravel's TrimStrings, run before emptyToNull: every string in the input,
 * nested arrays and objects included, except password keys, the host's
 * `except` keys and richtext documents (Lexical JSON is stored as written).
 */
export function trimStrings(value: unknown, except: string[] = [], path: string[] = []): unknown {
	if (typeof value === "string") {
		return excepted(path, [...NEVER_TRIM, ...except]) ? value : value.replaceAll(EDGES, "");
	}
	if (Array.isArray(value)) {
		return value.map((v, i) => trimStrings(v, except, [...path, String(i)]));
	}
	if (value === null || typeof value !== "object" || isEditorState(value)) {
		return value;
	}
	return Object.fromEntries(
		Object.entries(value).map(([k, v]) => [k, trimStrings(v, except, [...path, k])]),
	);
}
