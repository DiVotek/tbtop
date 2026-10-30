/** Keys that reach a prototype when written through `bag[key]`. */
const UNSAFE = new Set(["__proto__", "constructor", "prototype"]);

export const isSafeKey = (key: string): boolean => !UNSAFE.has(key);

/** `bag[key]` for own properties only: an inherited one (`toString`, a polluted prototype) is undefined. */
export function own(bag: object, key: string): unknown {
	return Object.hasOwn(bag, key) ? (bag as Record<string, unknown>)[key] : undefined;
}
