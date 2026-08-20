export interface FieldConstraints {
	required?: boolean;
	min?: number;
	max?: number;
	email?: boolean;
	url?: boolean;
	integer?: boolean;
	regex?: string;
	in?: string[];
}

interface Issue {
	path: (string | number)[];
	message: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Compiles wire constraints into a zod-shaped `{ parse }` validator
 * (throws `{ issues }`), so the ported form blur-validation works
 * without a zod dependency. The server re-validates regardless.
 */
export function compileConstraints(byField: Record<string, FieldConstraints>): {
	parse: (input: unknown) => unknown;
} {
	return {
		parse(input: unknown): unknown {
			const issues = Object.entries(byField).flatMap(([name, rules]) =>
				issuesFor(input, name, rules),
			);
			if (issues.length > 0) {
				throw { issues };
			}
			return input;
		},
	};
}

function issuesFor(input: unknown, name: string, rules: FieldConstraints): Issue[] {
	const issues: Issue[] = [];
	for (const { path, value } of resolvePaths(input, name.split("."))) {
		const message = checkField(value, rules);
		if (message) {
			issues.push({ path, message });
		}
	}
	return issues;
}

interface Resolved {
	path: string[];
	value: unknown;
}

/**
 * Resolves a dotted key against the data. A `*` segment fans out over every
 * element of an array at that point (`items.*.name` → `items.0.name`,
 * `items.1.name`), mirroring how Laravel expands wildcard rules; a non-array
 * under `*` yields nothing, so an empty repeater raises no sub-field issues.
 * Concrete segments keep resolving past a missing value so a required leaf
 * is still reported as undefined.
 */
function resolvePaths(input: unknown, segments: string[], resolved: string[] = []): Resolved[] {
	const [head, ...rest] = segments;
	if (head === undefined) {
		return [{ path: resolved, value: input }];
	}
	if (head !== "*") {
		return resolvePaths(memberOf(input, head), rest, [...resolved, head]);
	}
	if (!Array.isArray(input)) {
		return [];
	}
	return input.flatMap((item, index) => resolvePaths(item, rest, [...resolved, String(index)]));
}

function memberOf(value: unknown, key: string): unknown {
	if (value === null || typeof value !== "object") {
		return undefined;
	}
	return (value as Record<string, unknown>)[key];
}

/**
 * Messages are i18n KEYS (validation.*), not display text — compileConstraints
 * runs outside React (no useTranslation hook available at materialize time),
 * so translation happens once, at the single point each caller turns an issue
 * into a displayed fieldError (formBlock's revalidateField, actionBlock's
 * applyZodIssues). A parameterized key carries its value as a ":value" suffix
 * (e.g. "validation.min:5") since the Issue.message wire shape is a plain
 * string shared with consumer-authored zod schemas — the translator (see
 * translateValidationMessage in i18n.tsx) splits on ":" and interpolates
 * {min}/{max} into the looked-up template, matching the {count}-style
 * convention used elsewhere (e.g. field.repeater.items).
 */
export function checkField(value: unknown, c: FieldConstraints): string | null {
	const empty = value === undefined || value === null || value === "";
	const blank = empty || (Array.isArray(value) && value.length === 0);
	if (blank && c.required) {
		return "validation.required";
	}
	// `[]` is still present for size rules (Laravel fails `min:2` on it).
	return empty ? null : checkPresent(value, c);
}

function checkPresent(value: unknown, c: FieldConstraints): string | null {
	return checkSize(value, c) ?? checkFormat(value, c);
}

// Arrays (repeaters, tags) size by item count; numbers by value; else by char length.
function sizeOf(value: unknown): number {
	if (typeof value === "number") {
		return value;
	}
	if (Array.isArray(value)) {
		return value.length;
	}
	return String(value).length;
}

function checkSize(value: unknown, c: FieldConstraints): string | null {
	const size = sizeOf(value);
	if (c.min !== undefined && size < c.min) {
		return `validation.min:${c.min}`;
	}
	if (c.max !== undefined && size > c.max) {
		return `validation.max:${c.max}`;
	}
	return null;
}

function checkFormat(value: unknown, c: FieldConstraints): string | null {
	const str = String(value);
	if (c.integer && !Number.isInteger(Number(value))) {
		return "validation.integer";
	}
	if (c.email && !EMAIL_RE.test(str)) {
		return "validation.email";
	}
	if (c.regex && !new RegExp(c.regex).test(str)) {
		return "validation.regex";
	}
	if (c.in && !inAllowed(value, c.in)) {
		return "validation.in";
	}
	return null;
}

// Multi-value fields (multiple select, tags, checkbox list) are checked per element,
// mirroring the server's `field.*` placement of `in`.
function inAllowed(value: unknown, allowed: string[]): boolean {
	if (Array.isArray(value)) {
		return value.every((item) => allowed.includes(String(item)));
	}
	return allowed.includes(String(value));
}
