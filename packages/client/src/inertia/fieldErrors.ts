import type { Translate } from "../i18n/i18n";
import { translateValidationMessage } from "../i18n/i18n";

/**
 * Preserve Laravel's dotted key for locale and nested-field UI, while adding
 * the root key consumed by field components.
 */
export function liftNestedErrors(errors: Record<string, string>): Record<string, string> {
	const lifted: Record<string, string> = { ...errors };
	for (const [key, message] of Object.entries(errors)) {
		const root = key.split(".")[0] ?? key;
		if (root !== key && lifted[root] === undefined) {
			lifted[root] = message;
		}
	}
	return lifted;
}

/** Shape of a zod (or zod-like) parse error, narrowed structurally. */
export interface ZodLike {
	issues?: { path: (string | number)[]; message: string }[];
}

/**
 * Map a caught zod parse error to a lifted field-error bag. Returns
 * `undefined` when `err` doesn't carry zod issues at all (a non-validation
 * throw the caller should treat differently); returns a (possibly empty)
 * bag when it does. Pass `pathFilter` to scope to a single field (blur-time
 * revalidation); omit it for a full-form pre-flight parse.
 */
export function fieldErrorsFromZodIssues(
	err: unknown,
	t: Translate,
	pathFilter?: (path: (string | number)[]) => boolean,
): Record<string, string> | undefined {
	const issues = (err as ZodLike).issues;
	if (!Array.isArray(issues)) {
		return undefined;
	}
	const fields: Record<string, string> = {};
	for (const issue of issues) {
		if (pathFilter && !pathFilter(issue.path)) {
			continue;
		}
		const name = issue.path.map(String).join(".");
		if (name && fields[name] === undefined) {
			fields[name] = translateValidationMessage(t, issue.message);
		}
	}
	return liftNestedErrors(fields);
}
