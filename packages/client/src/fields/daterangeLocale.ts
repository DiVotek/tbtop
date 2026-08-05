/**
 * Week-start resolution for the calendar. The native <input type="date"> we
 * replaced took this from the OS for free; react-day-picker needs it passed in.
 */

/** Regions that start the week on Sunday. Everywhere else Monday (ISO 8601). */
const SUNDAY_FIRST_REGIONS: Record<string, true> = {
	US: true,
	CA: true,
	JP: true,
	IL: true,
	KR: true,
	TW: true,
	HK: true,
	MX: true,
	BR: true,
	PH: true,
	ZA: true,
	CO: true,
	PE: true,
	VE: true,
};

export type WeekStart = 0 | 1;

export function resolveWeekStart(locale: string | undefined): WeekStart {
	const region = regionOf(locale);
	return region && SUNDAY_FIRST_REGIONS[region] ? 0 : 1;
}

/** Browser locale, or undefined outside a browser (tests, SSR). */
export function browserLocale(): string | undefined {
	return typeof navigator === "undefined" ? undefined : navigator.language;
}

function regionOf(locale: string | undefined): string | undefined {
	if (!locale) {
		return undefined;
	}
	// "en-US" → "US". Intl.Locale also resolves "en" → "US" via likely subtags,
	// which would wrongly make a bare "en" Sunday-first, so parse literally.
	const parts = locale.split("-");
	const region = parts.at(-1);
	return region && region.length === 2 ? region.toUpperCase() : undefined;
}
