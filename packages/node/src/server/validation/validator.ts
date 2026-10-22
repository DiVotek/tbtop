import { currentContext } from "../../dsl/context";
import { parseCsv, parseRule } from "../../dsl/rules";
import { CHECKS, confirmedMatches, IMPLICIT, type RuleInput, type SizeKind } from "./checks";
import { dataGet, dataHas, dataSet, expandKey } from "./data";
import { format, MESSAGES } from "./messages";

/**
 * A rule the host implements, e.g. `unique`/`exists` against its own database.
 * `check` may return a string: the failure message itself, instead of `message`.
 */
export interface HostRule {
	check: (
		value: unknown,
		params: string[],
		key: string,
	) => boolean | string | Promise<boolean | string>;
	message: string;
}

export interface ValidateOptions {
	attributes?: Record<string, string>;
	hostRules?: Record<string, HostRule>;
	/** Message templates by rule; default: the request's `validationMessages`. */
	messages?: Record<string, string>;
}

export type ValidationResult =
	| { ok: true; validated: Record<string, unknown> }
	| { ok: false; errors: Record<string, string[]> };

interface Target {
	key: string;
	pattern: string;
	list: string[];
}

/**
 * Laravel's Validator over the same rule strings the DSL collects. An unknown
 * rule throws instead of passing: validation fails closed.
 */
export async function validate(
	data: unknown,
	rules: Record<string, string[]>,
	options: ValidateOptions = {},
): Promise<ValidationResult> {
	const errors: Record<string, string[]> = {};
	const validated: Record<string, unknown> = {};
	const targets = Object.entries(rules)
		.flatMap(([pattern, list]) =>
			expandKey(data, pattern).map((key) => ({ key, pattern, list })),
		)
		// `sometimes`: an absent key is not validated at all.
		.filter((t) => dataHas(data, t.key) || !t.list.includes("sometimes"));
	for (const target of targets) {
		const messages = await checkKey(data, target, options);
		if (messages.length > 0) {
			errors[target.key] = messages;
		} else if (dataHas(data, target.key)) {
			dataSet(validated, target.key, dataGet(data, target.key));
		}
	}
	return Object.keys(errors).length > 0 ? { ok: false, errors } : { ok: true, validated };
}

/** One rule applied to one key. */
interface RuleCall {
	name: string;
	input: RuleInput;
	target: Target;
	options: ValidateOptions;
}

async function checkKey(
	data: unknown,
	target: Target,
	options: ValidateOptions,
): Promise<string[]> {
	const value = dataGet(data, target.key);
	const present = dataHas(data, target.key);
	const skipOptional = !present || (target.list.includes("nullable") && value === null);
	const base = { value, data, sizeKind: sizeKind(target.list, value) };
	const bail = target.list.includes("bail");
	const messages: string[] = [];
	for (const rule of target.list.filter((r) => !MARKERS.has(r))) {
		const [name, raw] = parseRule(rule);
		const implicit = IMPLICIT.has(name);
		if (!implicit && skipOptional) {
			continue;
		}
		const call = { name, input: { ...base, params: ruleParams(name, raw) }, target, options };
		const verdict = await passes(call);
		if (verdict === true) {
			continue;
		}
		messages.push(typeof verdict === "string" ? verdict : message(call));
		if (implicit || bail) {
			break;
		}
	}
	return messages;
}

/** Rules that steer the run instead of checking the value. */
const MARKERS = new Set(["sometimes", "bail", "nullable"]);

/** str_getcsv parameters, except a regex keeps its commas. */
function ruleParams(name: string, raw: string | null): string[] {
	if (raw === null) {
		return [];
	}
	return name.endsWith("regex") ? [raw] : parseCsv(raw);
}

async function passes({ name, input, target, options }: RuleCall): Promise<boolean | string> {
	if (name === "confirmed") {
		return confirmedMatches(input.data, target.key, input.value);
	}
	const check = CHECKS[name];
	if (check !== undefined) {
		return check(input);
	}
	const host = options.hostRules?.[name];
	if (host === undefined) {
		throw new Error(
			`Validation rule "${name}" (on "${target.pattern}") is not supported; register it as a host rule.`,
		);
	}
	return host.check(input.value, input.params, target.key);
}

function sizeKind(list: string[], value: unknown): SizeKind {
	if (list.some((rule) => ["numeric", "integer", "decimal"].includes(parseRule(rule)[0]))) {
		return "numeric";
	}
	return Array.isArray(value) || list.includes("array") ? "array" : "string";
}

function template({ name, input, options }: RuleCall): string {
	const custom = options.messages ?? currentContext().validationMessages;
	return (
		custom[`${name}.${input.sizeKind}`] ??
		custom[name] ??
		MESSAGES[`${name}.${input.sizeKind}`] ??
		MESSAGES[name] ??
		options.hostRules?.[name]?.message ??
		"The :attribute field is invalid."
	);
}

function message(call: RuleCall): string {
	const { name, input, target, options } = call;
	const attribute = (key: string) => options.attributes?.[key] ?? humanize(key);
	const [first = "", second = ""] = input.params;
	return format(template(call), {
		attribute: options.attributes?.[target.pattern] ?? attribute(target.key),
		other: attribute(first),
		value: name === "multiple_of" ? first : display(dataGet(input.data, first)),
		values: valuesReplacement(name, input.params, attribute),
		min: first,
		max: name === "max" ? first : second,
		size: first,
		digits: first,
	});
}

function valuesReplacement(
	name: string,
	params: string[],
	attribute: (key: string) => string,
): string {
	if (name === "required_with" || name === "required_without") {
		return params.map(attribute).join(" / ");
	}
	return (name.startsWith("required_") ? params.slice(1) : params).join(", ");
}

function display(value: unknown): string {
	if (typeof value === "boolean") {
		return value ? "true" : "false";
	}
	return value === null ? "empty" : String(value);
}

/** Laravel's fallback attribute name: snake_case, underscores as spaces. */
function humanize(key: string): string {
	return key
		.replaceAll(/([a-z\d])([A-Z])/g, "$1_$2")
		.toLowerCase()
		.replaceAll("_", " ");
}
