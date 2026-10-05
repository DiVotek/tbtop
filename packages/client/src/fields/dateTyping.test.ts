import { describe, expect, test } from "bun:test";
import { formatTypedDay, localeDateFormat, parseTypedDay } from "./dateTyping";

const HINTS = { day: "dd", month: "mm", year: "yyyy" };

function format(locale: string) {
	return localeDateFormat(locale, HINTS);
}

describe("localeDateFormat", () => {
	test("takes field order from the locale, not a hardcoded list", () => {
		expect(format("uk").order).toEqual(["day", "month", "year"]);
		expect(format("en-US").order).toEqual(["month", "day", "year"]);
		expect(format("ja").order).toEqual(["year", "month", "day"]);
	});

	test("builds the placeholder with the locale's own separators", () => {
		expect(format("uk").placeholder).toBe("dd.mm.yyyy");
		expect(format("en-US").placeholder).toBe("mm/dd/yyyy");
	});

	test("falls back to en rather than throwing on a malformed tag", () => {
		expect(format("not-a-locale!!").order).toEqual(["month", "day", "year"]);
	});
});

describe("parseTypedDay: locale format", () => {
	test("reads the day and month in the order the locale writes them", () => {
		expect(parseTypedDay("05.03.2026", format("uk"))).toBe("2026-03-05");
		expect(parseTypedDay("03/05/2026", format("en-US"))).toBe("2026-03-05");
		expect(parseTypedDay("05/03/2026", format("en-GB"))).toBe("2026-03-05");
	});

	test("accepts single-digit day and month", () => {
		expect(parseTypedDay("5.3.2026", format("uk"))).toBe("2026-03-05");
	});

	test("accepts a locale whose separator is more than one character", () => {
		expect(parseTypedDay("2026. 03. 05.", format("hu"))).toBe("2026-03-05");
	});

	test("folds non-Latin digits back to ASCII", () => {
		expect(parseTypedDay("۲۰۲۶/۰۳/۰۵", format("fa-IR"))).toBe("2026-03-05");
	});
});

describe("parseTypedDay: ISO fallback", () => {
	test("accepts a pasted ISO day in any locale", () => {
		expect(parseTypedDay("2026-03-05", format("uk"))).toBe("2026-03-05");
		expect(parseTypedDay("2026-03-05", format("en-US"))).toBe("2026-03-05");
	});
});

describe("parseTypedDay: rejection", () => {
	test("returns null for half-typed text", () => {
		expect(parseTypedDay("05.0", format("uk"))).toBeNull();
		expect(parseTypedDay("05.03.20", format("uk"))).toBeNull();
	});

	test("returns null for empty text", () => {
		expect(parseTypedDay("", format("uk"))).toBeNull();
		expect(parseTypedDay("   ", format("uk"))).toBeNull();
	});

	test("rejects a day that does not exist instead of rolling it over", () => {
		expect(parseTypedDay("30.02.2026", format("uk"))).toBeNull();
		expect(parseTypedDay("32.01.2026", format("uk"))).toBeNull();
		expect(parseTypedDay("05.13.2026", format("uk"))).toBeNull();
	});

	test("requires a four-digit year rather than guessing a century", () => {
		expect(parseTypedDay("05.03.26", format("uk"))).toBeNull();
	});

	test("rejects text that is not a date", () => {
		expect(parseTypedDay("tomorrow", format("uk"))).toBeNull();
	});
});

describe("formatTypedDay", () => {
	test("renders a stored ISO day in the locale's numeric format", () => {
		expect(formatTypedDay("2026-03-05", "uk")).toBe("05.03.2026");
		expect(formatTypedDay("2026-03-05", "en-US")).toBe("03/05/2026");
	});

	test("round-trips through parse for every locale it renders", () => {
		for (const locale of ["uk", "en-US", "en-GB", "ja", "hu", "de", "fa-IR"]) {
			const text = formatTypedDay("2026-03-05", locale);
			expect(parseTypedDay(text, format(locale))).toBe("2026-03-05");
		}
	});

	test("renders empty for a missing or malformed value", () => {
		expect(formatTypedDay(null, "uk")).toBe("");
		expect(formatTypedDay("not-a-date", "uk")).toBe("");
	});
});
