// The native <input type="date"> we replaced took locale and week start from
// the OS for free; react-day-picker needs both passed in.

import type { Formatters } from "react-day-picker";

/**
 * Regions that start the week on Sunday. Only consulted when the runtime lacks
 * Intl.Locale#getWeekInfo (Firefox before 137), which knows this exactly.
 */
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

export type WeekStart = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/**
 * getWeekInfo counts Monday..Sunday as 1..7; DayPicker wants Sunday..Saturday
 * as 0..6. Only asked of tags that carry a region: ICU expands a bare "en" to
 * en-Latn-US and would report Sunday, disagreeing with the literal-parse
 * fallback below on the very case an admin language without a region hits.
 */
export function resolveWeekStart(locale: string | undefined): WeekStart {
	const region = regionOf(locale);
	if (!region) {
		return 1;
	}
	const firstDay = weekInfoFirstDay(locale);
	if (firstDay) {
		return (firstDay % 7) as WeekStart;
	}
	return SUNDAY_FIRST_REGIONS[region] ? 0 : 1;
}

// Baseline 2024, but not yet in TypeScript's lib.dom — and absent in older
// Firefox, which is why resolveWeekStart still keeps a region fallback.
type WeekInfoLocale = Intl.Locale & { getWeekInfo?: () => { firstDay: number } };

function weekInfoFirstDay(locale: string | undefined): number | undefined {
	if (!locale) {
		return undefined;
	}
	try {
		return (new Intl.Locale(locale) as WeekInfoLocale).getWeekInfo?.().firstDay;
	} catch {
		return undefined;
	}
}

/**
 * DayPicker formats through date-fns tokens against its built-in en-US locale.
 * Overriding these formatters routes every visible string through Intl instead,
 * which covers every locale the runtime knows without shipping locale modules.
 */
export function intlFormatters(locale: string | undefined): Partial<Formatters> {
	const tag = usableTag(locale);
	const caption = new Intl.DateTimeFormat(tag, { month: "long", year: "numeric" });
	const monthLong = new Intl.DateTimeFormat(tag, { month: "long" });
	const weekdayShort = new Intl.DateTimeFormat(tag, { weekday: "short" });
	const dayNumeric = new Intl.NumberFormat(tag);
	// A year is a 4-digit number, so the default grouping would render 2026 as
	// "2,026" (or "2.026" in de). Day numbers never reach that width.
	const yearNumeric = new Intl.NumberFormat(tag, { useGrouping: false });

	return {
		formatCaption: (month) => caption.format(month),
		formatMonthDropdown: (month) => monthLong.format(month),
		formatWeekdayName: (weekday) => weekdayShort.format(weekday),
		formatDay: (day) => dayNumeric.format(day.getDate()),
		formatYearDropdown: (year) => yearNumeric.format(year.getFullYear()),
	};
}

/** Intl throws RangeError on a malformed tag; the locale comes from the server. */
export function usableTag(locale: string | undefined): string {
	if (!locale) {
		return "en";
	}
	try {
		Intl.DateTimeFormat.supportedLocalesOf(locale);
		return locale;
	} catch {
		return "en";
	}
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
	// The first subtag is always the language, so a lone "en" has no region.
	const [, ...subtags] = locale.split("-");
	const region = subtags.at(-1);
	return region && region.length === 2 ? region.toUpperCase() : undefined;
}
