import { describe, expect, test } from "bun:test";
import { runWithContext, S } from "../src";
import { applyKindFormat } from "../src/dsl/kindFormat";
import { formatPhpDate } from "../src/dsl/phpDate";
import expected from "./fixtures/phpDates.json";

const inKyiv = <T>(run: () => T) => runWithContext({ timezone: "Europe/Kyiv" }, run);

describe("formatPhpDate matches PHP's DateTime::format", () => {
	for (const [value, formats] of Object.entries(expected)) {
		test(value, () => {
			const actual = inKyiv(() =>
				Object.fromEntries(Object.keys(formats).map((f) => [f, formatPhpDate(value, f)])),
			);
			expect(actual).toEqual(formats);
		});
	}
});

describe("kind formats", () => {
	test("a TIME column renders as H:i; an offset instant keeps its own offset", () => {
		inKyiv(() => {
			expect(applyKindFormat("time", {}, "09:30:00")).toBe("09:30");
			expect(applyKindFormat("datetime", {}, "2024-01-01T10:00:00Z")).toBe(
				"2024-01-01 10:00:00",
			);
			expect(applyKindFormat("date", {}, new Date("2024-01-01T23:30:00Z"))).toBe(
				"2024-01-02",
			);
		});
	});

	test("minDate(Date) takes the app timezone's day, not UTC's", () => {
		const late = new Date("2024-05-01T22:30:00Z");
		const node = inKyiv(() => JSON.parse(JSON.stringify(new S().date("d").minDate(late))));
		expect(node.options.minDate ?? node.minDate).toBe("2024-05-02");
	});
});
