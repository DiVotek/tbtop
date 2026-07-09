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

	// Previously only a hand-picked allowlist of ~19 names resolved; any other
	// valid lucide-react icon (e.g. the ones dashboard system stats use)
	// silently rendered nothing. Every lucide.dev slug must resolve now.
	test.each([
		"cpu",
		"memory-stick",
		"hard-drive",
		"database",
		"server",
		"activity",
	])("resolves the full lucide icon set, e.g. %s", (name) => {
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
