/** One `{value, label}` entry of a fixed option list (HasOptions.php). */
export interface Choice {
	value: string | number | boolean;
	label: string;
	description?: string;
	disabled?: boolean;
	display?: { image?: string; subtitle?: string; html?: string };
}

/** One case of an enum-like source: what PHP reads from HasLabel/HasColor/HasDescription. */
export interface EnumCase {
	value: string | number;
	label?: string;
	color?: string;
	description?: string;
}

/**
 * The TS stand-in for a PHP enum class: built with `defineEnum()` from a
 * literal map, or from a native TS enum object (labels are the member names).
 */
export interface EnumSource {
	readonly __enum: true;
	cases(): EnumCase[];
}

export function defineEnum(
	entries: Record<string, Omit<EnumCase, "value">> | Record<string, string | number>,
): EnumSource {
	return { __enum: true, cases: () => enumCases(entries) };
}

function enumCases(
	entries: Record<string, Omit<EnumCase, "value">> | Record<string, string | number>,
): EnumCase[] {
	const out: EnumCase[] = [];
	for (const [key, entry] of Object.entries(entries)) {
		if (typeof entry === "object") {
			out.push({ value: key, ...entry });
		} else if (!/^\d+$/.test(key)) {
			out.push({ value: entry, label: key });
		}
	}
	return out;
}

export function isEnumSource(value: unknown): value is EnumSource {
	return (value as Partial<EnumSource> | null)?.__enum === true;
}

/** Wire contract: option values are strings, as form data and URL params are. */
export function normalizeOptions<T extends { value: unknown }>(
	options: T[],
): (Omit<T, "value"> & { value: string })[] {
	return options.map(({ value, ...rest }) => ({ value: String(value), ...rest }));
}

/** `{value, label, description?}` per case (EnumOptions::options). */
export function enumOptions(source: EnumSource): Choice[] {
	return source.cases().map((c) => {
		const option: Choice = { value: String(c.value), label: caseLabel(c) };
		if (c.description !== undefined) {
			option.description = c.description;
		}
		return option;
	});
}

/** Badge entries keyed by the stored value (EnumOptions::badgeEntries). */
export function enumBadgeEntries(
	source: EnumSource,
): Record<string, { label: string; color?: string }> {
	const entries: Record<string, { label: string; color?: string }> = {};
	for (const c of source.cases()) {
		entries[String(c.value)] =
			c.color === undefined
				? { label: caseLabel(c) }
				: { label: caseLabel(c), color: c.color };
	}
	return entries;
}

function caseLabel(c: EnumCase): string {
	return c.label === undefined || c.label === "" ? String(c.value) : c.label;
}

export function choicesOf(options: Choice[] | EnumSource): Choice[] {
	return isEnumSource(options) ? enumOptions(options) : options;
}
