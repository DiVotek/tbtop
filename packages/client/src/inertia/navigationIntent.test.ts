import { describe, expect, test } from "bun:test";
import { consumeServerRedirect, markServerRedirect } from "./navigationIntent";

describe("server redirect navigation intent", () => {
	test("expires an unconsumed marker before a later navigation", async () => {
		markServerRedirect();
		await Promise.resolve();

		expect(consumeServerRedirect({})).toBe(false);
	});

	test("remains observable to every guard handling the same visit", () => {
		const visit = {};
		markServerRedirect();

		expect(consumeServerRedirect(visit)).toBe(true);
		expect(consumeServerRedirect(visit)).toBe(true);
		expect(consumeServerRedirect({})).toBe(false);
	});
});
