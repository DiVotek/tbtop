/**
 * Column count (1-8) or per-breakpoint override, mirrors the PHP
 * ColumnsValidator shape used by S::grid()/S::section()/Field::columnSpan().
 */
export type ColumnsSpec = number | { sm?: number; md?: number; lg?: number; xl?: number };

export interface ColumnPlacementBag {
	colSpan?: unknown;
	colStart?: unknown;
}

// Tailwind purge only keeps classes that appear as literal strings in
// source, so every grid-cols combination is spelled out per breakpoint.
const BASE: Record<number, string> = {
	1: "grid-cols-1",
	2: "grid-cols-2",
	3: "grid-cols-3",
	4: "grid-cols-4",
	5: "grid-cols-5",
	6: "grid-cols-6",
	7: "grid-cols-7",
	8: "grid-cols-8",
};

const SM: Record<number, string> = {
	1: "sm:grid-cols-1",
	2: "sm:grid-cols-2",
	3: "sm:grid-cols-3",
	4: "sm:grid-cols-4",
	5: "sm:grid-cols-5",
	6: "sm:grid-cols-6",
	7: "sm:grid-cols-7",
	8: "sm:grid-cols-8",
};

const MD: Record<number, string> = {
	1: "md:grid-cols-1",
	2: "md:grid-cols-2",
	3: "md:grid-cols-3",
	4: "md:grid-cols-4",
	5: "md:grid-cols-5",
	6: "md:grid-cols-6",
	7: "md:grid-cols-7",
	8: "md:grid-cols-8",
};

const LG: Record<number, string> = {
	1: "lg:grid-cols-1",
	2: "lg:grid-cols-2",
	3: "lg:grid-cols-3",
	4: "lg:grid-cols-4",
	5: "lg:grid-cols-5",
	6: "lg:grid-cols-6",
	7: "lg:grid-cols-7",
	8: "lg:grid-cols-8",
};

const XL: Record<number, string> = {
	1: "xl:grid-cols-1",
	2: "xl:grid-cols-2",
	3: "xl:grid-cols-3",
	4: "xl:grid-cols-4",
	5: "xl:grid-cols-5",
	6: "xl:grid-cols-6",
	7: "xl:grid-cols-7",
	8: "xl:grid-cols-8",
};

// Back-compat: a bare int stacks to one column below md, N columns at md+.
const LEGACY_INT: Record<number, string> = {
	1: "grid-cols-1",
	2: "grid-cols-1 md:grid-cols-2",
	3: "grid-cols-1 md:grid-cols-3",
	4: "grid-cols-1 md:grid-cols-4",
	5: "grid-cols-1 md:grid-cols-5",
	6: "grid-cols-1 md:grid-cols-6",
	7: "grid-cols-1 md:grid-cols-7",
	8: "grid-cols-1 md:grid-cols-8",
};

/** Resolves a grid/section `cols`/`columns` spec to static Tailwind classes. */
export function resolveColumnsClass(spec: ColumnsSpec | undefined): string {
	const oneCol = BASE[1] ?? "grid-cols-1";
	if (spec == null) {
		return oneCol;
	}
	if (typeof spec === "number") {
		return LEGACY_INT[spec] ?? oneCol;
	}
	const classes = [
		oneCol,
		spec.sm != null ? SM[spec.sm] : undefined,
		spec.md != null ? MD[spec.md] : undefined,
		spec.lg != null ? LG[spec.lg] : undefined,
		spec.xl != null ? XL[spec.xl] : undefined,
	];
	return classes.filter(Boolean).join(" ");
}

const PLACEMENT_BREAKPOINTS = ["sm", "md", "lg", "xl"] as const;

// Back-compat: a bare int places at md+ only, matching resolveColumnsClass's
// LEGACY_INT — the base .field-col-place rule already defaults to span 1 /
// auto below md, so a bare int must NOT set the unscoped --col-span/--col-start
// or it would apply below md too and overflow a single-column mobile grid.
function placementVars(prop: "span" | "start", spec: ColumnsSpec): Record<string, string> {
	if (typeof spec === "number") {
		return { [`--col-${prop}-md`]: String(spec) };
	}
	const vars: Record<string, string> = {};
	for (const bp of PLACEMENT_BREAKPOINTS) {
		const value = spec[bp];
		if (value != null) {
			vars[`--col-${prop}-${bp}`] = String(value);
		}
	}
	return vars;
}

/** Narrows an unknown wire value to a ColumnsSpec — a bare number or a {sm,md,lg,xl} bag. */
function toColumnsSpec(value: unknown): ColumnsSpec | undefined {
	if (typeof value === "number") {
		return value;
	}
	if (typeof value !== "object" || value === null) {
		return undefined;
	}
	// Narrowed to a non-null object above; TS's `object` type lacks an index signature.
	const record = value as Record<string, unknown>;
	const spec: { sm?: number; md?: number; lg?: number; xl?: number } = {};
	for (const bp of PLACEMENT_BREAKPOINTS) {
		const bpValue = record[bp];
		if (typeof bpValue === "number") {
			spec[bp] = bpValue;
		}
	}
	return spec;
}

export interface ColumnPlacement {
	className?: string;
	style?: Record<string, string>;
}

/** Resolves colSpan/colStart into the `.field-col-place` class + CSS vars. */
export function resolveColumnPlacement(bag: ColumnPlacementBag): ColumnPlacement {
	const colSpan = toColumnsSpec(bag.colSpan);
	const colStart = toColumnsSpec(bag.colStart);
	if (colSpan == null && colStart == null) {
		return {};
	}
	const style: Record<string, string> = {
		...(colSpan != null ? placementVars("span", colSpan) : {}),
		...(colStart != null ? placementVars("start", colStart) : {}),
	};
	return { className: "field-col-place", style };
}
