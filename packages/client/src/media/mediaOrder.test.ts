import { expect, test } from "bun:test";
import { orderMediaItems, reorderMediaIds } from "./mediaOrder";

test("reorderMediaIds moves the dragged media id to the drop target", () => {
	expect(reorderMediaIds(["cover", "side", "rear"], "rear", "cover")).toEqual([
		"rear",
		"cover",
		"side",
	]);
});

test("reorderMediaIds preserves the order when either id is unknown", () => {
	const ids = ["cover", "side"];
	expect(reorderMediaIds(ids, "missing", "side")).toBe(ids);
	expect(reorderMediaIds(ids, "cover", "missing")).toBe(ids);
});

test("orderMediaItems preserves resolved items when another id is unresolved", () => {
	const cover = { id: "cover" };
	const side = { id: "side" };

	expect(orderMediaItems([cover, side], ["side", "unresolved", "cover"])).toEqual([side, cover]);
});
