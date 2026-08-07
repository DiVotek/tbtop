import { describe, expect, test } from "bun:test";
import { intlFormatters, resolveWeekStart, usableTag } from "./daterangeLocale";

describe("resolveWeekStart", () => {
	test.each([
		["en-US", 0],
		["en-GB", 1],
		["uk-UA", 1],
		["ar-EG", 6],
	])("%s starts the week on day %i", (locale, expected) => {
		expect(resolveWeekStart(locale)).toBe(expected as 0 | 1 | 6);
	});

	// ICU expands a bare "en" to en-Latn-US, which would report Sunday on
	// runtimes with getWeekInfo and Monday on those without. Neither the tag nor
	// the admin language says anything about the region, so both must agree.
	test.each(["en", "uk", undefined])("%p carries no region and stays Monday-first", (locale) => {
		expect(resolveWeekStart(locale)).toBe(1);
	});

	test("a script subtag is not read as a region", () => {
		expect(resolveWeekStart("zh-Hans")).toBe(1);
	});
});

describe("intlFormatters", () => {
	// A 4-digit year picks up the default grouping: "2,026" in en, "2.026" in de.
	test.each(["en", "de"])("%s renders the year without a grouping separator", (locale) => {
		const year = intlFormatters(locale).formatYearDropdown?.(new Date(2026, 0, 1));

		expect(year).toBe("2026");
	});

	test("day numbers follow the locale", () => {
		const day = intlFormatters("en").formatDay?.(new Date(2026, 0, 5));

		expect(day).toBe("5");
	});

	test("month and weekday names follow the locale", () => {
		const formatters = intlFormatters("uk");

		expect(formatters.formatMonthDropdown?.(new Date(2026, 2, 1))).toBe("березень");
		expect(formatters.formatWeekdayName?.(new Date(2026, 2, 2))).toBe("пн");
	});
});

describe("usableTag", () => {
	test("a malformed tag degrades to English", () => {
		expect(usableTag("not a tag")).toBe("en");
		expect(usableTag(undefined)).toBe("en");
	});

	test("a valid tag passes through", () => {
		expect(usableTag("uk-UA")).toBe("uk-UA");
	});
});
