/**
 * Scrolls to and focuses the first form field with a visible error.
 *
 * For translatable fields (keyed as `fieldName.locale`), activates the locale
 * tab containing the error before scrolling.
 */
export function scrollToFirstError(
	fieldErrors: Record<string, string>,
	formEl: HTMLElement | null,
	setActiveLocale: ((locale: string) => void) | null,
): void {
	if (!formEl || Object.keys(fieldErrors).length === 0) {
		return;
	}

	const { errorFieldSet, localeErrorMap } = buildErrorSets(fieldErrors);
	const targetWrapper = findFirstErrorWrapper(formEl, errorFieldSet);

	if (!targetWrapper) {
		scrollToFallbackError(formEl);
		return;
	}

	activateLocaleIfNeeded(targetWrapper, localeErrorMap, setActiveLocale);
	targetWrapper.scrollIntoView({ behavior: "smooth", block: "center" });
	focusFirstControl(targetWrapper);
}

function buildErrorSets(fieldErrors: Record<string, string>): {
	errorFieldSet: Set<string>;
	localeErrorMap: Map<string, string>;
} {
	const errorFieldSet = new Set<string>();
	const localeErrorMap = new Map<string, string>();

	for (const key of Object.keys(fieldErrors)) {
		const dotIdx = key.lastIndexOf(".");
		if (dotIdx === -1) {
			errorFieldSet.add(key);
			continue;
		}
		const base = key.slice(0, dotIdx);
		const locale = key.slice(dotIdx + 1);
		errorFieldSet.add(base);
		if (!localeErrorMap.has(base)) {
			localeErrorMap.set(base, locale);
		}
	}

	return { errorFieldSet, localeErrorMap };
}

function findFirstErrorWrapper(
	formEl: HTMLElement,
	errorFieldSet: Set<string>,
): HTMLElement | null {
	const wrappers = Array.from(formEl.querySelectorAll<HTMLElement>("[data-field-name]"));
	for (const wrapper of wrappers) {
		if (errorFieldSet.has(wrapper.dataset.fieldName ?? "")) {
			return wrapper;
		}
	}
	return null;
}

function scrollToFallbackError(formEl: HTMLElement): void {
	const firstErrorEl = formEl.querySelector<HTMLElement>("[data-testid^='field-error-']");
	if (firstErrorEl) {
		firstErrorEl.scrollIntoView({ behavior: "smooth", block: "center" });
	}
}

function activateLocaleIfNeeded(
	wrapper: HTMLElement,
	localeErrorMap: Map<string, string>,
	setActiveLocale: ((locale: string) => void) | null,
): void {
	const fieldName = wrapper.dataset.fieldName ?? "";
	const errorLocale = localeErrorMap.get(fieldName);
	if (errorLocale && setActiveLocale) {
		setActiveLocale(errorLocale);
	}
}

function focusFirstControl(wrapper: HTMLElement): void {
	const focusable = wrapper.querySelector<HTMLElement>(
		"input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex='-1'])",
	);
	focusable?.focus();
}
