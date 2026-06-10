/**
 * Scrolls to and focuses the first form field that has a visible error in DOM order.
 *
 * For translatable fields (keyed as `fieldName.locale`), activates the locale tab
 * that contains the error before scrolling.
 *
 * @param fieldErrors   Current field error map keyed by field name (or `field.locale`).
 * @param formEl        The <form> element to search within.
 * @param setActiveLocale  Setter from ActiveLocaleCtx — called when the error lives in an
 *                         inactive locale tab. Pass null when there are no translatable fields.
 */
export function scrollToFirstError(
	fieldErrors: Record<string, string>,
	formEl: HTMLElement | null,
	setActiveLocale: ((locale: string) => void) | null,
): void {
	if (!formEl) {
		return;
	}

	const errorNames = Object.keys(fieldErrors);
	if (errorNames.length === 0) {
		return;
	}

	// Build a set of field names (stripping .locale suffix for translatable fields).
	const errorFieldSet = new Set<string>();
	const localeErrorMap = new Map<string, string>(); // fieldName -> locale with error

	for (const key of errorNames) {
		const dotIdx = key.lastIndexOf(".");
		if (dotIdx !== -1) {
			const base = key.slice(0, dotIdx);
			const locale = key.slice(dotIdx + 1);
			errorFieldSet.add(base);
			// Keep the first locale encountered per base field.
			if (!localeErrorMap.has(base)) {
				localeErrorMap.set(base, locale);
			}
		} else {
			errorFieldSet.add(key);
		}
	}

	// Find all field wrappers in DOM order and pick the first one that has an error.
	const wrappers = Array.from(formEl.querySelectorAll<HTMLElement>("[data-field-name]"));
	let targetWrapper: HTMLElement | null = null;

	for (const wrapper of wrappers) {
		const name = wrapper.dataset.fieldName ?? "";
		if (errorFieldSet.has(name)) {
			targetWrapper = wrapper;
			break;
		}
	}

	if (!targetWrapper) {
		// Fallback: no [data-field-name] wrapper found — try by error[data-testid] attribute.
		const firstErrorEl = formEl.querySelector<HTMLElement>("[data-testid^='field-error-']");
		if (firstErrorEl) {
			firstErrorEl.scrollIntoView({ behavior: "smooth", block: "center" });
		}
		return;
	}

	const fieldName = targetWrapper.dataset.fieldName ?? "";
	const errorLocale = localeErrorMap.get(fieldName);

	// If the error is in a translatable field, switch to that locale tab first so the
	// field is visible before we try to focus it.
	if (errorLocale && setActiveLocale) {
		setActiveLocale(errorLocale);
	}

	targetWrapper.scrollIntoView({ behavior: "smooth", block: "center" });

	// Focus the first focusable control inside the wrapper.
	const focusable = targetWrapper.querySelector<HTMLElement>(
		"input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex='-1'])",
	);
	focusable?.focus();
}
