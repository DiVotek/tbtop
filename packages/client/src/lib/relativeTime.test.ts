import { describe, expect, test } from "bun:test";
import { relativeTime } from "./relativeTime";

const now = new Date("2026-06-24T12:00:00Z");

describe("relativeTime", () => {
	test("formats seconds, minutes, hours, and days in the past", () => {
		expect(relativeTime("2026-06-24T11:59:30Z", "en", now)).toBe("30 seconds ago");
		expect(relativeTime("2026-06-24T11:58:00Z", "en", now)).toBe("2 minutes ago");
		expect(relativeTime("2026-06-24T09:00:00Z", "en", now)).toBe("3 hours ago");
		expect(relativeTime("2026-06-22T12:00:00Z", "en", now)).toBe("2 days ago");
	});

	test("returns an empty string for an unparseable timestamp", () => {
		expect(relativeTime("not-a-date", "en", now)).toBe("");
	});
});
