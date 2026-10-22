/**
 * Whether a boolean/checkbox value reads as "on". Mirrors the server's
 * TableFilterApplier::castBoolean: an int column without a boolean cast
 * arrives as 1/0, and a filter restored from the URL comes back as "true".
 */
export function isOn(value: unknown): boolean {
	if (typeof value === "boolean") {
		return value;
	}
	if (typeof value === "number") {
		return value === 1;
	}
	if (typeof value === "string") {
		return ["1", "true", "yes"].includes(value.toLowerCase());
	}
	return false;
}
