import { describe, expect, it, spyOn } from "bun:test";
import type { ConditionContext } from "../structure/types";
import { compileCondition } from "./conditionCompiler";

function ctx(data: Record<string, unknown> = {}): ConditionContext {
	return { record: undefined, data, user: null };
}

function scopedCtx(
	rootData: Record<string, unknown>,
	currentData: Record<string, unknown>,
): ConditionContext {
	return { record: undefined, data: currentData, user: null, root: rootData };
}

describe("ConditionCompiler: field ops", () => {
	it("ConditionCompiler: eq returns true when values match as-is", () => {
		const fn = compileCondition({ op: "eq", field: "type", value: "video" });
		expect(fn(ctx({ type: "video" }))).toBe(true);
	});

	it("ConditionCompiler: eq returns true via String() coercion (number vs string)", () => {
		const fn = compileCondition({ op: "eq", field: "rating", value: "3" });
		expect(fn(ctx({ rating: 3 }))).toBe(true);
	});

	it("ConditionCompiler: eq returns false when values differ", () => {
		const fn = compileCondition({ op: "eq", field: "type", value: "image" });
		expect(fn(ctx({ type: "video" }))).toBe(false);
	});

	it("ConditionCompiler: neq returns true when values differ", () => {
		const fn = compileCondition({ op: "neq", field: "type", value: "video" });
		expect(fn(ctx({ type: "image" }))).toBe(true);
	});

	it("ConditionCompiler: neq returns false when values match", () => {
		const fn = compileCondition({ op: "neq", field: "type", value: "video" });
		expect(fn(ctx({ type: "video" }))).toBe(false);
	});

	it("ConditionCompiler: in returns true when value is a member", () => {
		const fn = compileCondition({ op: "in", field: "role", value: ["admin", "editor"] });
		expect(fn(ctx({ role: "admin" }))).toBe(true);
	});

	it("ConditionCompiler: in returns false when value is not a member", () => {
		const fn = compileCondition({ op: "in", field: "role", value: ["admin", "editor"] });
		expect(fn(ctx({ role: "viewer" }))).toBe(false);
	});

	it("ConditionCompiler: in uses scalar normalization (number in string list)", () => {
		const fn = compileCondition({ op: "in", field: "code", value: ["1", "2"] });
		expect(fn(ctx({ code: 1 }))).toBe(true);
	});

	it("ConditionCompiler: notIn returns true when value is absent from list", () => {
		const fn = compileCondition({ op: "notIn", field: "role", value: ["viewer"] });
		expect(fn(ctx({ role: "admin" }))).toBe(true);
	});

	it("ConditionCompiler: notIn returns false when value is in list", () => {
		const fn = compileCondition({ op: "notIn", field: "role", value: ["viewer"] });
		expect(fn(ctx({ role: "viewer" }))).toBe(false);
	});

	it("ConditionCompiler: empty returns true for null", () => {
		const fn = compileCondition({ op: "empty", field: "published_at" });
		expect(fn(ctx({ published_at: null }))).toBe(true);
	});

	it("ConditionCompiler: empty returns true for undefined", () => {
		const fn = compileCondition({ op: "empty", field: "published_at" });
		expect(fn(ctx({}))).toBe(true);
	});

	it("ConditionCompiler: empty returns true for empty string", () => {
		const fn = compileCondition({ op: "empty", field: "title" });
		expect(fn(ctx({ title: "" }))).toBe(true);
	});

	it("ConditionCompiler: empty returns true for empty array", () => {
		const fn = compileCondition({ op: "empty", field: "tags" });
		expect(fn(ctx({ tags: [] }))).toBe(true);
	});

	it("ConditionCompiler: empty returns false for non-empty value", () => {
		const fn = compileCondition({ op: "empty", field: "title" });
		expect(fn(ctx({ title: "hello" }))).toBe(false);
	});

	it("ConditionCompiler: notEmpty is the negation of empty", () => {
		const fn = compileCondition({ op: "notEmpty", field: "title" });
		expect(fn(ctx({ title: "hello" }))).toBe(true);
		expect(fn(ctx({ title: "" }))).toBe(false);
	});

	it("ConditionCompiler: truthy uses JS truthiness", () => {
		const fn = compileCondition({ op: "truthy", field: "published" });
		expect(fn(ctx({ published: true }))).toBe(true);
		expect(fn(ctx({ published: false }))).toBe(false);
		expect(fn(ctx({ published: 1 }))).toBe(true);
		expect(fn(ctx({ published: 0 }))).toBe(false);
	});

	it("ConditionCompiler: gt returns true when field > value numerically", () => {
		const fn = compileCondition({ op: "gt", field: "rating", value: 3 });
		expect(fn(ctx({ rating: 4 }))).toBe(true);
		expect(fn(ctx({ rating: 3 }))).toBe(false);
	});

	it("ConditionCompiler: gt returns false for non-numeric value", () => {
		const fn = compileCondition({ op: "gt", field: "title", value: 0 });
		expect(fn(ctx({ title: "abc" }))).toBe(false);
	});

	it("ConditionCompiler: gte returns true when field >= value", () => {
		const fn = compileCondition({ op: "gte", field: "rating", value: 3 });
		expect(fn(ctx({ rating: 3 }))).toBe(true);
		expect(fn(ctx({ rating: 2 }))).toBe(false);
	});

	it("ConditionCompiler: lt returns true when field < value", () => {
		const fn = compileCondition({ op: "lt", field: "rating", value: 5 });
		expect(fn(ctx({ rating: 4 }))).toBe(true);
		expect(fn(ctx({ rating: 5 }))).toBe(false);
	});

	it("ConditionCompiler: lte returns true when field <= value", () => {
		const fn = compileCondition({ op: "lte", field: "rating", value: 5 });
		expect(fn(ctx({ rating: 5 }))).toBe(true);
		expect(fn(ctx({ rating: 6 }))).toBe(false);
	});
});

describe("ConditionCompiler: dotted-path field resolution", () => {
	it("ConditionCompiler: resolves dotted path title.en into nested object", () => {
		const fn = compileCondition({ op: "eq", field: "title.en", value: "Hello" });
		expect(fn(ctx({ title: { en: "Hello" } }))).toBe(true);
	});

	it("ConditionCompiler: dotted path returns undefined (empty) when intermediate is missing", () => {
		const fn = compileCondition({ op: "empty", field: "meta.slug" });
		expect(fn(ctx({}))).toBe(true);
	});
});

describe("ConditionCompiler: combinators", () => {
	it("ConditionCompiler: all returns true only when all sub-conditions are true", () => {
		const fn = compileCondition({
			op: "all",
			conds: [
				{ op: "eq", field: "status", value: "draft" },
				{ op: "empty", field: "published_at" },
			],
		});
		expect(fn(ctx({ status: "draft", published_at: null }))).toBe(true);
		expect(fn(ctx({ status: "draft", published_at: "2024-01-01" }))).toBe(false);
		expect(fn(ctx({ status: "published", published_at: null }))).toBe(false);
	});

	it("ConditionCompiler: any returns true when at least one sub-condition is true", () => {
		const fn = compileCondition({
			op: "any",
			conds: [
				{ op: "eq", field: "type", value: "image" },
				{ op: "eq", field: "type", value: "video" },
			],
		});
		expect(fn(ctx({ type: "image" }))).toBe(true);
		expect(fn(ctx({ type: "video" }))).toBe(true);
		expect(fn(ctx({ type: "text" }))).toBe(false);
	});

	it("ConditionCompiler: not negates the wrapped condition", () => {
		const fn = compileCondition({
			op: "not",
			cond: { op: "eq", field: "status", value: "archived" },
		});
		expect(fn(ctx({ status: "draft" }))).toBe(true);
		expect(fn(ctx({ status: "archived" }))).toBe(false);
	});
});

describe("ConditionCompiler: fail-open cases", () => {
	it("ConditionCompiler: server op returns false (not hidden/disabled) and warns", () => {
		const warnings: unknown[] = [];
		const spy = spyOn(console, "warn").mockImplementation((...args) => warnings.push(args));
		try {
			const fn = compileCondition({ op: "server" });
			expect(fn(ctx())).toBe(false);
			expect(warnings.length).toBeGreaterThan(0);
		} finally {
			spy.mockRestore();
		}
	});

	it("ConditionCompiler: unknown op returns false and warns", () => {
		const warnings: unknown[] = [];
		const spy = spyOn(console, "warn").mockImplementation((...args) => warnings.push(args));
		try {
			const fn = compileCondition({ op: "bogus" } as unknown as Parameters<
				typeof compileCondition
			>[0]);
			expect(fn(ctx())).toBe(false);
			expect(warnings.length).toBeGreaterThan(0);
		} finally {
			spy.mockRestore();
		}
	});
});

describe("ConditionCompiler: scope chain", () => {
	it("ConditionCompiler: bare field resolves against current scope", () => {
		const fn = compileCondition({ op: "eq", field: "type", value: "video" });
		// current scope has type=video, root scope has type=text
		expect(fn(scopedCtx({ type: "text" }, { type: "video" }))).toBe(true);
	});

	it("ConditionCompiler: $root.-prefixed field resolves against root scope", () => {
		const fn = compileCondition({ op: "eq", field: "$root.status", value: "draft" });
		// root scope has status=draft; current scope does not
		expect(fn(scopedCtx({ status: "draft" }, { type: "video" }))).toBe(true);
	});

	it("ConditionCompiler: $root. field does not see current scope", () => {
		const fn = compileCondition({ op: "eq", field: "$root.type", value: "video" });
		// only current scope has type=video; root does not
		expect(fn(scopedCtx({ status: "draft" }, { type: "video" }))).toBe(false);
	});

	it("ConditionCompiler: single-scope ctx (no root) resolves bare field from data (slice-A regression)", () => {
		const fn = compileCondition({ op: "eq", field: "status", value: "draft" });
		expect(fn(ctx({ status: "draft" }))).toBe(true);
	});

	it("ConditionCompiler: $root. on single-scope ctx falls back to data", () => {
		const fn = compileCondition({ op: "eq", field: "$root.status", value: "draft" });
		expect(fn(ctx({ status: "draft" }))).toBe(true);
	});
});
