import { describe, expect, test } from "bun:test";
import { defaultMessages } from "../../i18n/defaultMessages";
import type { StructureNode } from "../types";
import { activeFilters, formatFilterValue } from "./filterChipValue";

const t = (key: string) => defaultMessages[key] ?? key;
const format = (kind: string, value: unknown, options?: { value: string; label: string }[]) =>
	formatFilterValue({ kind, value, options, locale: "en", t });

function node(kind: string, name: string, label?: string): StructureNode {
	return { kind, name, options: label ? { label } : {}, meta: {} } as StructureNode;
}

describe("activeFilters", () => {
	test("keeps declaration order and skips empty or undeclared values", () => {
		const filters = [
			node("text", "title", "Title"),
			node("in", "status"),
			node("text", "body"),
		];
		const result = activeFilters(filters, {
			status: ["1"],
			title: "hello",
			body: "",
			ghost: "x",
		});
		expect(result.map((f) => [f.name, f.label])).toEqual([
			["title", "Title"],
			["status", "status"],
		]);
	});

	test("an empty list or an unbounded range is not active", () => {
		const filters = [node("in", "status"), node("daterange", "at")];
		expect(activeFilters(filters, { status: [], at: { from: null, to: null } })).toEqual([]);
	});
});

describe("formatFilterValue", () => {
	const options = [
		{ value: "1", label: "Published" },
		{ value: "0", label: "Draft" },
	];

	test("choice kinds show option labels, falling back to the raw value", () => {
		expect(format("in", ["1", "0"], options)).toBe("Published, Draft");
		expect(format("select", 1, options)).toBe("Published");
		expect(format("select", "9", options)).toBe("9");
	});

	test("a boolean that is on reads from the label alone; off says No", () => {
		expect(format("boolean", "true")).toBeUndefined();
		expect(format("boolean", false)).toBe("No");
	});

	test("a date range shows both bounds or the one that is set", () => {
		const day = (iso: string) =>
			new Date(`${iso}T00:00:00`).toLocaleDateString("en", { dateStyle: "medium" });
		expect(format("daterange", { from: "2026-01-02", to: "2026-01-05" })).toBe(
			`${day("2026-01-02")} – ${day("2026-01-05")}`,
		);
		expect(format("daterange", { from: "2026-01-02", to: null })).toBe(
			`from ${day("2026-01-02")}`,
		);
		expect(format("daterange", { from: null, to: "2026-01-05" })).toBe(
			`until ${day("2026-01-05")}`,
		);
	});

	test("a malformed date from the URL is shown as typed", () => {
		expect(format("date", "2026-02-30")).toBe("2026-02-30");
	});

	test("free text passes through", () => {
		expect(format("text", "jane")).toBe("jane");
	});
});
