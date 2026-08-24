import { expect, test } from "bun:test";
import { reorderMediaIds } from "./mediaOrder";

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
