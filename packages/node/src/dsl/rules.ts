import type { Cond } from "./cond";

/**
 * Laravel rule strings, kept verbatim: the same `rules('integer|min:0')` call
 * authors both stacks, and the wire constraints derive from it (CollectsRules.php).
 */
export function appendRules(owner: string, existing: string[], rules: string | string[]): string[] {
	if (typeof rules === "string" && rules.includes("regex:")) {
		throw new Error(
			`"${owner}": pass regex rules as an array - '|' inside the pattern would be split.`,
		);
	}
	const list = typeof rules === "string" ? rules.split("|") : rules;
	return [...new Set([...existing, ...list])];
}

const VALUELESS = ["required", "email", "url", "integer"];
const VALUED = ["min", "max", "regex", "in"];

/** The rule list as the wire constraint vocabulary; unknown rules are server-only (ConstraintMap.php). */
export function toConstraints(rules: string[]): Record<string, unknown> {
	const constraints: Record<string, unknown> = {};
	for (const rule of rules) {
		const [name, value] = parseRule(rule);
		if (VALUELESS.includes(name)) {
			constraints[name] = true;
		} else if (VALUED.includes(name) && value !== null) {
			constraints[name] = castConstraint(name, value);
		}
	}
	return constraints;
}

export function parseRule(rule: string): [string, string | null] {
	const colon = rule.indexOf(":");
	return colon === -1 ? [rule, null] : [rule.slice(0, colon), rule.slice(colon + 1)];
}

function castConstraint(name: string, value: string): unknown {
	if (name === "in") {
		return parseCsv(value);
	}
	if (name === "min" || name === "max") {
		return isNumeric(value) ? Number(value) : value;
	}
	if (name === "regex") {
		return barePattern(value);
	}
	return value;
}

export function isNumeric(value: unknown): boolean {
	if (typeof value === "number") {
		return Number.isFinite(value);
	}
	return typeof value === "string" && /^\s*[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?\s*$/i.test(value);
}

/** str_getcsv for one line: quoted values may hold commas and doubled quotes. */
export function parseCsv(line: string): string[] {
	const out: string[] = [];
	let at = 0;
	while (at <= line.length) {
		const [value, end] = readCell(line, at);
		out.push(value);
		at = end + 1;
	}
	return out;
}

function readCell(line: string, at: number): [string, number] {
	if (line[at] !== '"') {
		const comma = line.indexOf(",", at);
		const end = comma === -1 ? line.length : comma;
		return [line.slice(at, end), end];
	}
	let value = "";
	let i = at + 1;
	while (i < line.length && !(line[i] === '"' && line[i + 1] !== '"')) {
		value += line[i];
		i += line[i] === '"' ? 2 : 1;
	}
	const comma = line.indexOf(",", i);
	return [value, comma === -1 ? line.length : comma];
}

/** PCRE `/pat/i` → bare `pat`; the client feeds it to `new RegExp`. */
export function barePattern(value: string): string {
	const delimiter = value[0] ?? "";
	const end = value.lastIndexOf(delimiter);
	if (delimiter === "" || end < 1) {
		return value;
	}
	return value.slice(1, end);
}

/** The Laravel rule that reproduces a field-comparison Cond (CondToRequiredRule.php). */
export function condToRequiredRule(cond: Cond): string {
	const data = cond.toJSON() as { op: string; field: string; value?: unknown };
	const f = data.field;
	switch (data.op) {
		case "eq":
			return `required_if:${f},${ruleValue(data.value)}`;
		case "in":
			return `required_if:${f},${ruleList(data.value)}`;
		case "neq":
			return `required_unless:${f},${ruleValue(data.value)}`;
		case "notIn":
			return `required_unless:${f},${ruleList(data.value)}`;
		case "notEmpty":
			return `required_with:${f}`;
		case "truthy":
			return `required_if_accepted:${f}`;
		case "empty":
			return `required_without:${f}`;
		default:
			throw new Error(`requiredIf: operator "${data.op}" is not supported server-side`);
	}
}

function ruleValue(value: unknown): string {
	const text = typeof value === "boolean" ? String(value) : String(value ?? "null");
	if (text.includes(",")) {
		throw new Error(
			`requiredIf: value "${text}" contains a comma, which cannot be encoded in a Laravel rule string`,
		);
	}
	return text;
}

function ruleList(values: unknown): string {
	return (values as unknown[]).map(ruleValue).join(",");
}
