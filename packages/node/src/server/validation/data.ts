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
