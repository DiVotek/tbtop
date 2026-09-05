// Typed date entry for the date/daterange popovers. The admin types in their
// own locale's numeric format; ISO Y-m-d is accepted too, for pasted values.

import { usableTag } from "./daterangeLocale";
import { toIsoDay } from "./daterangeValue";

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

const NUMERIC_DAY: Intl.DateTimeFormatOptions = {
	calendar: "gregory",
	year: "numeric",
	month: "2-digit",
	day: "2-digit",
};

type DatePart = "day" | "month" | "year";

export interface PlaceholderParts {
	day: string;
	month: string;
	year: string;
}

export interface DateFormat {
	/** Field order as the locale writes it — day, month, year for uk. */
	order: DatePart[];
	/** Empty-input hint, built with the locale's own separators. */
	placeholder: string;
	/** Maps the locale's own digits back to ASCII; empty for Latin ones. */
	digits: Record<string, string>;
}

/**
 * The trigger label uses dateStyle "medium", which is not always digits
 * ("5 бер. 2026 р."). Entry needs a form that parses back, so it asks numeric.
 */
export function localeDateFormat(
	locale: string | undefined,
	placeholderParts: PlaceholderParts,
): DateFormat {
	const tag = usableTag(locale);
	const parts = new Intl.DateTimeFormat(tag, NUMERIC_DAY).formatToParts(new Date(2026, 2, 5));

	const order: DatePart[] = [];
	let placeholder = "";
	for (const part of parts) {
		if (part.type === "day" || part.type === "month" || part.type === "year") {
			order.push(part.type);
			placeholder += placeholderParts[part.type];
			continue;
		}
		placeholder += part.value;
	}

	if (order.length !== 3) {
		const { year, month, day } = placeholderParts;
		return {
			order: ["year", "month", "day"],
			placeholder: `${year}-${month}-${day}`,
			digits: {},
		};
	}
	return { order, placeholder, digits: digitMap(tag) };
}

/** fa-IR renders "۲۰۲۶" and ar-EG "٢٠٢٦" — those digits must fold to ASCII. */
function digitMap(tag: string): Record<string, string> {
	const nf = new Intl.NumberFormat(tag, { useGrouping: false });
	const map: Record<string, string> = {};
	for (let digit = 0; digit <= 9; digit++) {
		const native = nf.format(digit);
		if (native !== String(digit)) {
			map[native] = String(digit);
		}
	}
	return map;
}

/**
 * Typed text to an ISO day, or null when it is not a complete valid date —
 * half-typed and wrong are one case: the caller keeps the text, emits nothing.
 */
export function parseTypedDay(text: string, format: DateFormat): string | null {
	let normalized = "";
	for (const char of text.trim()) {
		normalized += format.digits[char] ?? char;
	}
	// ISO first: a leading 4-digit year is a shape no locale's
	// day or month field can take, so the branches cannot disagree.
	if (ISO_DAY.test(normalized)) {
		return validDay(
			Number(normalized.slice(0, 4)),
			Number(normalized.slice(5, 7)),
			Number(normalized.slice(8, 10)),
		);
	}
	return parseLocaleDay(normalized, format);
}

/**
 * Separators match as any run of non-digits, not as their exact text: hu
 * separates with ". " and trails a dot, ar-EG puts an RTL mark in the slash.
 */
function parseLocaleDay(normalized: string, format: DateFormat): string | null {
	const groups = normalized.split(/\D+/).filter((group) => group !== "");
	if (groups.length !== 3) {
		return null;
	}

	const values: Partial<Record<DatePart, number>> = {};
	for (const [index, part] of format.order.entries()) {
		const group = groups[index];
		if (group === undefined || !hasExpectedWidth(part, group)) {
			return null;
		}
		values[part] = Number(group);
	}
	const { year, month, day } = values;
	if (year === undefined || month === undefined || day === undefined) {
		return null;
	}
	return validDay(year, month, day);
}

/**
 * A year must be written in full: two digits would have to guess a century,
 * and guessing wrong on a birth date is worse than asking for four.
 */
function hasExpectedWidth(part: DatePart, group: string): boolean {
	return part === "year" ? group.length === 4 : group.length <= 2;
}

/** Rejects an overflowing day (2026-02-30) instead of rolling it into March. */
function validDay(year: number, month: number, day: number): string | null {
	const date = new Date(year, month - 1, day);
	if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
		return null;
	}
	return toIsoDay(date);
}

/** Renders a stored ISO day in the locale's numeric format, for editing. */
export function formatTypedDay(iso: string | null | undefined, locale: string | undefined): string {
	if (!iso || !ISO_DAY.test(iso)) {
		return "";
	}
	const date = new Date(
		Number(iso.slice(0, 4)),
		Number(iso.slice(5, 7)) - 1,
		Number(iso.slice(8, 10)),
	);
	return new Intl.DateTimeFormat(usableTag(locale), NUMERIC_DAY).format(date);
}
