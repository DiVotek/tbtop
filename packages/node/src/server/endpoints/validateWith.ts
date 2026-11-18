import { invalid } from "../http";
import { dataGet, dataHas, dataSet, emptyToNull, expandKey } from "../validation/data";
import type { HostRule } from "../validation/validator";
import { validate } from "../validation/validator";

type Bag = Record<string, unknown>;

/** Validates or throws Laravel's 422; empty strings count as null first. */
export async function validated(
	input: unknown,
	rules: Record<string, string[]>,
	options: { attributes?: Record<string, string>; hostRules?: Record<string, HostRule> },
): Promise<Record<string, unknown>> {
	const result = await validate(emptyToNull(input ?? {}), rules, options);
	if (!result.ok) {
		throw invalid(result.errors);
	}
	return result.validated;
}

/** The keys the rules declare, values as-is: withoutValidation() keeps the shape, not the verdict. */
export function declaredKeysOnly(input: unknown, rules: Record<string, string[]>): Bag {
	const keys = Object.keys(rules).flatMap((pattern) => expandKey(input, pattern));
	const containers = new Set(
		keys.flatMap((key) =>
			key
				.split(".")
				.slice(0, -1)
				.map((_, i, parts) => parts.slice(0, i + 1).join(".")),
		),
	);
	const picked: Bag = {};
	for (const key of keys.filter((k) => dataHas(input, k))) {
		if (!containers.has(key)) {
			dataSet(picked, key, dataGet(input, key));
		} else if (!dataHas(picked, key)) {
			dataSet(picked, key, []);
		}
	}
	return picked;
}
