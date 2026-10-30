import { parseCsv, parseRule } from "../dsl/rules";
import { format, MESSAGES } from "../server/validation/messages";
import { humanize } from "../server/validation/validator";

const SIZED = ["string", "numeric", "array"] as const;

/**
 * The messages `rule` can render for `field`: every size variant of a sized
 * rule, under the field's label or Laravel's default attribute name.
 */
export function ruleMessages(field: string, rule: string, label?: string): string[] {
	const [name, raw] = parseRule(rule);
	const params = raw === null ? [] : parseCsv(raw);
	const templates = [MESSAGES[name], ...SIZED.map((kind) => MESSAGES[`${name}.${kind}`])].filter(
		(t): t is string => t !== undefined,
	);
	const attribute = label ?? humanize(field);
	return templates.map((t) => format(t, replacements(name, params, attribute)));
}

function replacements(name: string, params: string[], attribute: string): Record<string, string> {
	const [first = "", second = ""] = params;
	const named: Record<string, Record<string, string>> = {
		between: { min: first, max: second },
		digits_between: { min: first, max: second },
		max: { max: first },
		min: { min: first },
		size: { size: first },
		digits: { digits: first },
		multiple_of: { value: first },
		same: { other: first },
		different: { other: first },
		required_if: { other: first, value: second },
	};
	return { attribute, values: params.join(", "), ...named[name] };
}
