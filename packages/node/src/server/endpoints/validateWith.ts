import { invalid } from "../http";
import { emptyToNull } from "../validation/data";
import type { HostRule } from "../validation/validator";
import { validate } from "../validation/validator";

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
