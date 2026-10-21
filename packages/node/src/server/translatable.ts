import { defaultLocale } from "../dsl";

/** A locale map, decoded from JSON text when stored that way; null otherwise. */
export function asLocaleMap(raw: unknown): Record<string, unknown> | null {
	let value = raw;
	if (typeof value === "string" && value.startsWith("{")) {
		value = parseJson(value) ?? value;
	}
	if (value === null || typeof value !== "object" || Array.isArray(value)) {
		return null;
	}
	return value as Record<string, unknown>;
}

/** The default content locale's value, else the first non-empty one (TranslatableValue.php). */
export function pickTranslation(raw: unknown): unknown {
	const map = asLocaleMap(raw);
	if (map === null) {
		// A pre-translatable row in a JSON column holds an encoded scalar.
		return typeof raw === "string" && raw.startsWith('"') ? (parseJson(raw) ?? raw) : raw;
	}
	const filled = (v: unknown) => v !== null && v !== undefined && v !== "";
	const preferred = map[defaultLocale()];
	return filled(preferred) ? preferred : (Object.values(map).find(filled) ?? null);
}

function parseJson(text: string): unknown {
	try {
		return JSON.parse(text);
	} catch {
		return null;
	}
}
