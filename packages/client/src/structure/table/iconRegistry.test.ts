import { describe, expect, test } from "bun:test";
import { Star } from "lucide-react";
import { registerTableIcon, resolveIcon } from "./iconRegistry";

describe("iconRegistry", () => {
	test("resolves built-in check icon", () => {
		const Icon = resolveIcon("check");
		expect(Icon).toBeTruthy();
	});

	test("resolves built-in x icon", () => {
		const Icon = resolveIcon("x");
		expect(Icon).toBeTruthy();
	});

	test("returns undefined for unknown name", () => {
		expect(resolveIcon("no-such-icon-xyz")).toBeUndefined();
	});

	test.each([
		"inbox",
		"mail",
		"bell",
		"user",
		"external-link",
	])("resolves the chrome icon %s", (name) => {
		expect(resolveIcon(name)).toBeTruthy();
	});

	test("returns undefined for undefined input", () => {
		expect(resolveIcon(undefined)).toBeUndefined();
	});

	test("registerTableIcon makes custom icon resolvable", () => {
		registerTableIcon("my-star", Star);
		expect(resolveIcon("my-star")).toBe(Star);
	});
});
