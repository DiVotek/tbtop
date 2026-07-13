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
			const data = (input ?? {}) as Record<string, unknown>;
			const issues: Issue[] = [];
			for (const [name, rules] of Object.entries(byField)) {
				const message = checkField(data[name], rules);
				if (message) {
					issues.push({ path: [name], message });
				}
			}
			if (issues.length > 0) {
				throw { issues };
			}
			return input;
		},
	};
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
	if (empty) {
		return c.required ? "validation.required" : null;
	}
	return checkPresent(value, c);
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
	if (c.in && !c.in.includes(str)) {
		return "validation.in";
	}
	return null;
}
