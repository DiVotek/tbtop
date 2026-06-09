import { describe, expect, test } from "bun:test";
import type { StructureNode } from "../structure/structure";
import { addItem, emptyItem, moveItem, removeItem } from "./repeaterItems";

const subFields: StructureNode[] = [
	{ kind: "text", name: "title", options: {}, meta: {} },
	{ kind: "number", name: "qty", options: {}, meta: {} },
];

describe("repeater items", () => {
	test("emptyItem creates a record keyed by sub-field names with null values", () => {
		expect(emptyItem(subFields)).toEqual({ title: null, qty: null });
	});

	test("addItem appends an empty item", () => {
		const before = [{ title: "a", qty: 1 }];
		const after = addItem(before, subFields);
		expect(after).toHaveLength(2);
		expect(after[1]).toEqual({ title: null, qty: null });
	});

	test("removeItem removes the targeted index", () => {
		const items = [{ title: "a" }, { title: "b" }, { title: "c" }];
		expect(removeItem(items, 1)).toEqual([{ title: "a" }, { title: "c" }]);
	});

	test("moveItem up swaps with previous", () => {
		const items = [{ title: "a" }, { title: "b" }];
		expect(moveItem(items, 1, "up")).toEqual([{ title: "b" }, { title: "a" }]);
	});

	test("moveItem down swaps with next", () => {
		const items = [{ title: "a" }, { title: "b" }];
		expect(moveItem(items, 0, "down")).toEqual([{ title: "b" }, { title: "a" }]);
	});

	test("moveItem up at index 0 is a no-op", () => {
		const items = [{ title: "a" }, { title: "b" }];
		expect(moveItem(items, 0, "up")).toBe(items);
	});

	test("moveItem down at last index is a no-op", () => {
		const items = [{ title: "a" }, { title: "b" }];
		expect(moveItem(items, 1, "down")).toBe(items);
	});
});
