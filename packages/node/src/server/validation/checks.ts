import { isNumeric } from "../../dsl/rules";
import { dataGet, dataHas } from "./data";

export type SizeKind = "numeric" | "array" | "string";

export interface RuleInput {
	value: unknown;
	params: string[];
	data: unknown;
	sizeKind: SizeKind;
}

type Check = (input: RuleInput) => boolean;

const ACCEPTED = ["yes", "on", "1", "true"];

/** Laravel's validateRequired: null, a blank string and an empty array all count as missing. */
export function filled(value: unknown): boolean {
	if (value === null || value === undefined) {
		return false;
	}
	if (typeof value === "string") {
		return value.trim() !== "";
	}
	return !Array.isArray(value) || value.length > 0;
}

/** In Laravel, a JSON number in `in:1,2` matches loosely: compare as strings. */
function matchesAny(value: unknown, params: string[]): boolean {
	if (typeof value === "boolean") {
		return params.includes(value ? "true" : "false") || params.includes(value ? "1" : "0");
	}
	return params.includes(value === null ? "null" : String(value));
}

export function size(input: RuleInput): number {
	const { value, sizeKind } = input;
	if (sizeKind === "numeric" && isNumeric(value)) {
		return Number(value);
	}
	if (Array.isArray(value)) {
		return value.length;
	}
	return [...String(value ?? "")].length;
}

function pcre(param: string): RegExp {
	const delimiter = param[0] ?? "/";
	const end = param.lastIndexOf(delimiter);
	const flags = param.slice(end + 1).replaceAll(/[^imsu]/g, "");
	return new RegExp(param.slice(1, end), flags);
}

const text = (v: unknown): string =>
	typeof v === "string" || typeof v === "number" ? String(v) : "";
const others = (input: RuleInput): unknown[] => input.params.map((p) => dataGet(input.data, p));
const requiredWhen =
	(condition: (input: RuleInput) => boolean): Check =>
	(input) =>
		!condition(input) || filled(input.value);

/** Implicit rules run even when the key is absent. */
export const IMPLICIT = new Set([
	"accepted",
	"filled",
	"present",
	"required",
	"required_if",
	"required_if_accepted",
	"required_unless",
	"required_with",
	"required_without",
]);

/** strtotime() and checkdate(): parseable, and a Y-m-d part names a real day (no 2024-02-30). */
function isDate(value: string): boolean {
	const ymd = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
	if (ymd !== null) {
		const [y, m, d] = ymd.slice(1).map(Number) as [number, number, number];
		const real = new Date(Date.UTC(y, m - 1, d));
		if (real.getUTCMonth() !== m - 1 || real.getUTCDate() !== d) {
			return false;
		}
	}
	return !Number.isNaN(Date.parse(value));
}

export const CHECKS: Record<string, Check> = {
	accepted: ({ value }) => value === true || value === 1 || ACCEPTED.includes(text(value)),
	alpha: ({ value }) => typeof value === "string" && /^[\p{L}\p{M}]+$/u.test(value),
	alpha_dash: ({ value }) => /^[\p{L}\p{M}\p{N}_-]+$/u.test(text(value)),
	alpha_num: ({ value }) => /^[\p{L}\p{M}\p{N}]+$/u.test(text(value)),
	array: ({ value }) => Array.isArray(value) || (value !== null && typeof value === "object"),
	between: (input) =>
		size(input) >= Number(input.params[0]) && size(input) <= Number(input.params[1]),
	boolean: ({ value }) => [true, false, 0, 1, "0", "1"].includes(value as never),
	confirmed: () => true,
	date: ({ value }) => typeof value === "string" && isDate(value),
	different: (input) => others(input).every((other) => other !== input.value),
	digits: ({ value, params }) =>
		/^\d+$/.test(text(value)) && text(value).length === Number(params[0]),
	digits_between: ({ value, params }) =>
		/^\d+$/.test(text(value)) &&
		text(value).length >= Number(params[0]) &&
		text(value).length <= Number(params[1]),
	distinct: ({ value }) =>
		!Array.isArray(value) || new Set(value.map(String)).size === value.length,
	email: ({ value }) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text(value)),
	ends_with: ({ value, params }) => params.some((p) => text(value).endsWith(p)),
	filled: ({ value }) => filled(value),
	in: ({ value, params }) =>
		Array.isArray(value)
			? value.every((v) => matchesAny(v, params))
			: matchesAny(value, params),
	integer: ({ value }) => /^[+-]?\d+$/.test(text(value)),
	json: ({ value }) => typeof value === "string" && isJson(value),
	lowercase: ({ value }) => text(value) === text(value).toLowerCase(),
	max: (input) => size(input) <= Number(input.params[0]),
	min: (input) => size(input) >= Number(input.params[0]),
	multiple_of: ({ value, params }) => isNumeric(value) && Number(value) % Number(params[0]) === 0,
	not_in: ({ value, params }) => !matchesAny(value, params),
	not_regex: ({ value, params }) => !pcre(params.join(",")).test(text(value)),
	nullable: () => true,
	numeric: ({ value }) => isNumeric(value),
	present: () => true,
	regex: ({ value, params }) => pcre(params.join(",")).test(text(value)),
	required: ({ value }) => filled(value),
	required_if: requiredWhen((input) => matchesAny(others(input)[0], input.params.slice(1))),
	required_if_accepted: requiredWhen(
		(input) => CHECKS.accepted?.({ ...input, value: others(input)[0] }) === true,
	),
	required_unless: requiredWhen((input) => !matchesAny(others(input)[0], input.params.slice(1))),
	required_with: requiredWhen((input) => others(input).some(filled)),
	required_without: requiredWhen((input) => !others(input).every(filled)),
	same: (input) => others(input)[0] === input.value,
	size: (input) => size(input) === Number(input.params[0]),
	starts_with: ({ value, params }) => params.some((p) => text(value).startsWith(p)),
	string: ({ value }) => typeof value === "string",
	uppercase: ({ value }) => text(value) === text(value).toUpperCase(),
	url: ({ value }) => URL.canParse(text(value)) && /^[a-z][a-z0-9+.-]*:\/\//i.test(text(value)),
	uuid: ({ value }) =>
		/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(text(value)),
};

function isJson(value: string): boolean {
	try {
		JSON.parse(value);
		return true;
	} catch {
		return false;
	}
}

/** `confirmed` reads the sibling `{key}_confirmation`, so it needs the key itself. */
export function confirmedMatches(data: unknown, key: string, value: unknown): boolean {
	return dataHas(data, `${key}_confirmation`) && dataGet(data, `${key}_confirmation`) === value;
}
