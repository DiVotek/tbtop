const META_KEYS = ["id", "hidden", "disabled", "hiddenIf", "disabledIf"] as const;

export type Breakpoints = { sm?: number; md?: number; lg?: number; xl?: number };
export type Columns = number | Breakpoints;

/** Keys that live in node meta rather than options (Meta.php). */
export function metaKeys(): string[] {
	return [...META_KEYS];
}

/** Splits layout options into wire options and node meta. */
export function splitMeta(
	input: Record<string, unknown>,
): [Record<string, unknown>, Record<string, unknown>] {
	const options: Record<string, unknown> = {};
	const meta: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(input)) {
		const target = (META_KEYS as readonly string[]).includes(key) ? meta : options;
		target[key] = value;
	}
	return [options, meta];
}

/** Rejects keys outside the allowed set, naming the allowed ones. */
export function assertKnownKeys(
	context: string,
	opts: Record<string, unknown>,
	allowed: string[],
): void {
	for (const key of Object.keys(opts)) {
		if (allowed.includes(key)) {
			continue;
		}
		const hint = context === "section" && key === "label" ? " Did you mean 'title'?" : "";
		throw new Error(
			`Unknown ${context} option "${key}".${hint} Allowed: ${allowed.join(", ")}.`,
		);
	}
}

/** The int-or-breakpoint column shape (ColumnsValidator.php): each value 1-8. */
export function validateColumns(value: Columns, label: string): void {
	if (typeof value === "number") {
		inRange(value, label);
		return;
	}
	for (const [breakpoint, n] of Object.entries(value)) {
		if (!["sm", "md", "lg", "xl"].includes(breakpoint)) {
			throw new Error(
				`Invalid ${label} breakpoint "${breakpoint}". Allowed: sm, md, lg, xl.`,
			);
		}
		if (!Number.isInteger(n)) {
			throw new TypeError(`Invalid ${label}.${breakpoint}: must be an integer.`);
		}
		inRange(n as number, `${label}.${breakpoint}`);
	}
}

function inRange(value: number, label: string): void {
	if (value < 1 || value > 8) {
		throw new Error(`Invalid ${label} ${value}. Must be between 1 and 8.`);
	}
}

export function validatePlacement(opts: Record<string, unknown>): void {
	for (const key of ["colSpan", "colStart"]) {
		if (opts[key] !== undefined) {
			validateColumns(opts[key] as Columns, key);
		}
	}
}

/** One of an allowed value set (FlexValidator.php). */
export function oneOf(value: string, allowed: readonly string[], label: string): void {
	if (!allowed.includes(value)) {
		throw new Error(`Invalid ${label} "${value}". Allowed: ${allowed.join(", ")}.`);
	}
}

/** The 0-12 gap-N scale flex and grid share. */
export function validateGap(value: number, label = "flex gap"): void {
	if (value < 0 || value > 12) {
		throw new Error(`Invalid ${label} ${value}. Must be between 0 and 12.`);
	}
}

export type IconSpec = string | { name: string; position?: "left" | "right" };

export function normalizeIcon(icon: IconSpec): { name: string; position: string } {
	return typeof icon === "string"
		? { name: icon, position: "left" }
		: { name: icon.name, position: icon.position ?? "left" };
}
