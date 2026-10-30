/** A failed tester check; test runners report it like any thrown assertion. */
export class TbtopAssertionError extends Error {
	override name = "TbtopAssertionError";
}

export function fail(message: string): never {
	throw new TbtopAssertionError(message);
}

export function check(ok: boolean, message: string): void {
	if (!ok) {
		fail(message);
	}
}

/** PHPUnit's assertEquals: `2` equals `"2"`, objects and arrays compare by value. */
export function looseEqual(a: unknown, b: unknown): boolean {
	if (a === b) {
		return true;
	}
	if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) {
		return isScalar(a) && isScalar(b) && String(a) === String(b);
	}
	if (Array.isArray(a) !== Array.isArray(b)) {
		return false;
	}
	const left = Object.entries(a);
	const right = b as Record<string, unknown>;
	return (
		left.length === Object.keys(right).length &&
		left.every(([key, value]) => key in right && looseEqual(value, right[key]))
	);
}

const isScalar = (v: unknown) => ["string", "number", "bigint"].includes(typeof v);

export const show = (value: unknown): string => JSON.stringify(value) ?? String(value);
