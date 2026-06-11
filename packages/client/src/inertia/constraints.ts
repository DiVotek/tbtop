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

function checkField(value: unknown, c: FieldConstraints): string | null {
	const empty = value === undefined || value === null || value === "";
	if (empty) {
		return c.required ? "Required" : null;
	}
	return checkPresent(value, c);
}

function checkPresent(value: unknown, c: FieldConstraints): string | null {
	return checkSize(value, c) ?? checkFormat(value, c);
}

function checkSize(value: unknown, c: FieldConstraints): string | null {
	const size = typeof value === "number" ? value : String(value).length;
	if (c.min !== undefined && size < c.min) {
		return `Must be at least ${c.min}`;
	}
	if (c.max !== undefined && size > c.max) {
		return `Must be at most ${c.max}`;
	}
	return null;
}

function checkFormat(value: unknown, c: FieldConstraints): string | null {
	const str = String(value);
	if (c.integer && !Number.isInteger(Number(value))) {
		return "Must be an integer";
	}
	if (c.email && !EMAIL_RE.test(str)) {
		return "Invalid email";
	}
	if (c.regex && !new RegExp(c.regex).test(str)) {
		return "Invalid format";
	}
	if (c.in && !c.in.includes(str)) {
		return "Invalid choice";
	}
	return null;
}
