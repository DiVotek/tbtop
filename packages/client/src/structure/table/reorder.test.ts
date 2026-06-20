import { describe, expect, it } from "bun:test";
import { canReorder, computeReorder } from "./reorder";

describe("computeReorder", () => {
	const ids = ["a", "b", "c", "d"];

	it("moves an item down", () => {
		expect(computeReorder(ids, "a", "c")).toEqual(["b", "c", "a", "d"]);
	});

	it("moves an item up", () => {
		expect(computeReorder(ids, "d", "b")).toEqual(["a", "d", "b", "c"]);
	});

	it("is a no-op when active equals over", () => {
		expect(computeReorder(ids, "b", "b")).toEqual(ids);
	});

	it("swaps first and last", () => {
		expect(computeReorder(ids, "a", "d")).toEqual(["b", "c", "d", "a"]);
		expect(computeReorder(ids, "d", "a")).toEqual(["d", "a", "b", "c"]);
	});

	it("returns the input unchanged when an id is unknown", () => {
		expect(computeReorder(ids, "z", "a")).toEqual(ids);
		expect(computeReorder(ids, "a", "z")).toEqual(ids);
	});
});

describe("canReorder", () => {
	const base = { hasActiveFilters: false, reorderColumn: "sort_order" };

	it("is disabled when reordering is not configured", () => {
		expect(canReorder({ ...base, reorderColumn: undefined })).toBe(false);
	});

	it("is enabled with no sort, no filters, no tab", () => {
		expect(canReorder(base)).toBe(true);
	});

	it("is enabled when sorted by the reorder column ascending", () => {
		expect(canReorder({ ...base, sort: "sort_order:asc" })).toBe(true);
	});

	it("is disabled when sorted by a foreign column", () => {
		expect(canReorder({ ...base, sort: "title:asc" })).toBe(false);
	});

	it("is disabled when sorted by the reorder column descending", () => {
		expect(canReorder({ ...base, sort: "sort_order:desc" })).toBe(false);
	});

	it("is disabled when filters are active", () => {
		expect(canReorder({ ...base, hasActiveFilters: true })).toBe(false);
	});

	it("is enabled on the first (default) tab", () => {
		expect(canReorder({ ...base, tab: "all", firstTabName: "all" })).toBe(true);
	});

	it("is disabled on a non-default tab", () => {
		expect(canReorder({ ...base, tab: "published", firstTabName: "all" })).toBe(false);
	});
});
