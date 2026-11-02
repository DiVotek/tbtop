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

/** Every expected key is present and loosely equal; nested maps compare as subsets, lists whole. */
export function looseSubset(expected: Record<string, unknown>, actual: unknown): boolean {
	if (typeof actual !== "object" || actual === null) {
		return false;
	}
	const bag = actual as Record<string, unknown>;
	return Object.entries(expected).every(([key, value]) => {
		if (!(key in bag)) {
			return false;
		}
		const nested = typeof value === "object" && value !== null && !Array.isArray(value);
		return nested
			? looseSubset(value as Record<string, unknown>, bag[key])
			: looseEqual(value, bag[key]);
	});
}

const isScalar = (v: unknown) => ["string", "number", "bigint"].includes(typeof v);

export const show = (value: unknown): string => JSON.stringify(value) ?? String(value);
