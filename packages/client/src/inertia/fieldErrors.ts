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
