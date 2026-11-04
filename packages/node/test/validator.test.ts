import { describe, expect, test } from "bun:test";
import { collectRules, runWithContext, S, validate } from "../src";

const errorsOf = async (data: unknown, rules: Record<string, string[]>) => {
	const result = await validate(data, rules);
	return result.ok ? {} : result.errors;
};

describe("Laravel rule semantics", () => {
	test("absent keys skip non-implicit rules; nullable lets null through", async () => {
		expect(await errorsOf({}, { a: ["string", "max:3"] })).toEqual({});
		expect(await errorsOf({ a: null }, { a: ["string"] })).toEqual({
			a: ["The a field must be a string."],
		});
		expect(await errorsOf({ a: null }, { a: ["nullable", "string"] })).toEqual({});
	});

	test("url refuses a script scheme and honours url:http,https", async () => {
		const ok = async (value: string, rule = "url") =>
			Object.keys(await errorsOf({ a: value }, { a: [rule] })).length === 0;
		expect(await ok("https://example.com/a?b=1")).toBe(true);
		expect(await ok("ftp://files.example.com")).toBe(true);
		expect(await ok("javascript://%0Aalert(1)")).toBe(false);
		expect(await ok("JavaScript://x%0Aalert(1)")).toBe(false);
		expect(await ok("vbscript://x")).toBe(false);
		expect(await ok("example.com")).toBe(false);
		expect(await ok("ftp://files.example.com", "url:http,https")).toBe(false);
		expect(await ok("HTTPS://example.com", "url:http,https")).toBe(true);
	});

	test("a failed implicit rule stops the key; other failures accumulate", async () => {
		expect(await errorsOf({}, { a: ["required", "min:3"] })).toEqual({
			a: ["The a field is required."],
		});
		expect(await errorsOf({ a: "x" }, { a: ["min:3", "regex:/^\\d+$/"] })).toEqual({
			a: ["The a field must be at least 3 characters.", "The a field format is invalid."],
		});
	});

	test("size rules read numbers, strings or arrays by the declared type", async () => {
		expect(await errorsOf({ n: "12" }, { n: ["integer", "max:10"] })).toEqual({
			n: ["The n field must not be greater than 10."],
		});
		expect(await errorsOf({ t: ["a", "b"] }, { t: ["array", "max:1"] })).toEqual({
			t: ["The t field must not have more than 1 items."],
		});
	});

	test("wildcards expand against the data, and validated keeps declared keys only", async () => {
		const data = { rows: [{ h: "x", evil: 1 }, { h: "" }], other: 1 };
		expect(await errorsOf(data, { rows: ["array"], "rows.*.h": ["required"] })).toEqual({
			"rows.1.h": ["The rows.1.h field is required."],
		});
		const ok = await validate(
			{ rows: [{ h: "x", evil: 1 }], other: 1 },
			{ "rows.*.h": ["required"] },
		);
		expect(ok).toEqual({ ok: true, validated: { rows: [{ h: "x" }] } });
	});

	test("cross-field rules: required_if, required_with, same, confirmed", async () => {
		const rules = {
			company: ["required_if:type,company"],
			b: ["required_with:a"],
			c: ["same:a"],
			a: ["confirmed"],
		};
		expect(await errorsOf({ type: "company", a: "x", c: "y" }, rules)).toEqual({
			company: ["The company field is required when type is company."],
			b: ["The b field is required when a is present."],
			c: ["The c field must match a."],
			a: ["The a field confirmation does not match."],
		});
	});

	test("an unknown rule fails closed; a host rule fills the gap", async () => {
		await expect(validate({ a: "x" }, { a: ["exists:users,id"] })).rejects.toThrow(
			/not supported/,
		);
		const hostRules = {
			exists: { check: () => false, message: "The selected :attribute is invalid." },
		};
		expect(await validate({ a: "x" }, { a: ["exists:users,id"] }, { hostRules })).toEqual({
			ok: false,
			errors: { a: ["The selected a is invalid."] },
		});
	});
});

describe("collectRules (RuleWalker)", () => {
	test("distinct on a multiple select rejects a repeated value", async () => {
		const rules = collectRules([new S().select("tags").multiple().rules("distinct")]);
		expect(rules["tags.*"]).toContain("distinct");
		expect(await errorsOf({ tags: ["php", "go"] }, rules)).toEqual({});
		expect(Object.keys(await errorsOf({ tags: ["php", "php"] }, rules))).toEqual([
			"tags.0",
			"tags.1",
		]);
	});

	test("distinct compares loosely unless strict, and ignore_case folds case", async () => {
		expect(await errorsOf({ ids: [1, "1"] }, { "ids.*": ["distinct"] })).not.toEqual({});
		expect(await errorsOf({ ids: [1, "1"] }, { "ids.*": ["distinct:strict"] })).toEqual({});
		expect(await errorsOf({ t: ["A", "a"] }, { "t.*": ["distinct:ignore_case"] })).not.toEqual(
			{},
		);
	});

	test("repeaters, multiple selects and translatable fields get their own keys", () => {
		const s = new S();
		const rules = runWithContext(
			{ contentLocales: ["en", "uk"], defaultContentLocale: "en" },
			() =>
				collectRules([
					s.section({ title: "x" }, [s.text("title").required().translatable()]),
					s.select("tags").multiple().rules("required|in:a,b"),
					s.repeater("rows").set("fields", [s.text("h").required()]),
					s.number("n"),
				]),
		);
		expect(rules).toEqual({
			title: ["nullable", "array"],
			"title.en": ["required"],
			"title.uk": ["nullable"],
			tags: ["array", "required"],
			"tags.*": ["in:a,b"],
			rows: ["nullable"],
			"rows.*.h": ["required"],
			n: ["nullable"],
		});
	});
});

describe("run markers and dates", () => {
	test("sometimes skips an absent key; bail stops at the first failure", async () => {
		expect(await validate({}, { name: ["sometimes", "required", "string"] })).toEqual({
			ok: true,
			validated: {},
		});
		const failed = await validate({ name: 5 }, { name: ["bail", "string", "min:3"] });
		expect(failed.ok ? [] : failed.errors.name).toHaveLength(1);
	});

	test("date refuses a day the calendar does not have", async () => {
		expect((await validate({ d: "2024-02-30" }, { d: ["date"] })).ok).toBe(false);
		expect((await validate({ d: "2024-02-29" }, { d: ["date"] })).ok).toBe(true);
		expect((await validate({ d: "2024-02-29 10:00:00" }, { d: ["date"] })).ok).toBe(true);
	});
});
