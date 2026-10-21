import { currentContext, Upload } from "../../dsl";
import { fieldsByKey, type Rules } from "../../dsl/ruleWalker";
import type { SessionStore } from "../inertia/session";
import type { HostRule } from "../validation/validator";
import { ISSUED_RULE, issuedRule } from "./issued";

/**
 * RuleWalker::bindUploadPaths(): every upload value key also checks that its
 * path was issued to this session or is already stored on the records.
 */
export async function bindUploads(
	rules: Rules,
	children: unknown[],
	{ session, records }: { session: SessionStore; records: unknown[] },
): Promise<{ rules: Rules; hostRules: Record<string, HostRule> }> {
	const bound: Rules = { ...rules };
	let found = false;
	for (const [key, field] of Object.entries(fieldsByKey(children))) {
		if (!(field instanceof Upload)) {
			continue;
		}
		found = true;
		for (const valueKey of valueKeys(field, key)) {
			const target = field.isMultiple() ? `${valueKey}.*` : valueKey;
			bound[target] = [...(bound[target] ?? []), `${ISSUED_RULE}:${field.name}`];
		}
	}
	return {
		rules: bound,
		hostRules: found ? { [ISSUED_RULE]: await issuedRule(session, records) } : {},
	};
}

function valueKeys(field: Upload, key: string): string[] {
	return field.isTranslatableField()
		? currentContext().contentLocales.map((locale) => `${key}.${locale}`)
		: [key];
}
