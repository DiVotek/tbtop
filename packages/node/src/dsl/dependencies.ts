/**
 * Declared keys only, scalars as strings, booleans "1"/"0", empty strings
 * dropped: the dep shape every record-seeded closure sees (DependencyFilter.php).
 */
export function dependencyValues(
	declared: string[],
	bag: Record<string, unknown>,
): Record<string, string> {
	const out: Record<string, string> = {};
	for (const field of declared) {
		const text = scalarText(resolve(bag, field));
		if (text !== null && text !== "") {
			out[field] = text;
		}
	}
	return out;
}

function scalarText(value: unknown): string | null {
	if (typeof value === "boolean") {
		return value ? "1" : "0";
	}
	if (typeof value === "string" || typeof value === "number") {
		return String(value);
	}
	return null;
}

function resolve(bag: Record<string, unknown>, field: string): unknown {
	if (Object.hasOwn(bag, field)) {
		return bag[field];
	}
	const dot = field.indexOf(".");
	if (dot <= 0) {
		return null;
	}
	const parent = bag[field.slice(0, dot)];
	return parent !== null && typeof parent === "object"
		? (parent as Record<string, unknown>)[field.slice(dot + 1)]
		: null;
}
