import { describe, expect, test } from "bun:test";
import { S } from "../src";

const cropOf = (field: { toJSON(): unknown }) =>
	(field.toJSON() as { options: { image?: { crop?: unknown } } }).options.image?.crop;

describe("Upload crop (parity with Upload.php)", () => {
	const s = new S();

	test("crop() locks one aspect, and with no argument crops freely", () => {
		expect(cropOf(s.upload("cover").crop("16:9"))).toEqual({ aspects: ["16:9"] });
		expect(cropOf(s.upload("photo").crop())).toEqual({ aspects: ["free"] });
	});

	test("cropAspects() keeps order and drops duplicates", () => {
		expect(cropOf(s.upload("hero").cropAspects(["16:9", "4:3", "free", "16:9"]))).toEqual({
			aspects: ["16:9", "4:3", "free"],
		});
	});

	test("cropCircle() defaults to a square and keeps an aspect set before or after it", () => {
		expect(cropOf(s.upload("avatar").cropCircle())).toEqual({
			aspects: ["1:1"],
			shape: "round",
		});
		expect(cropOf(s.upload("a").crop("4:3").cropCircle())).toEqual({
			aspects: ["4:3"],
			shape: "round",
		});
		expect(cropOf(s.upload("b").cropCircle().crop("4:3"))).toEqual({
			aspects: ["4:3"],
			shape: "round",
		});
	});

	test("cropCircle(false) does not turn cropping on by itself", () => {
		expect(cropOf(s.upload("avatar").cropCircle(false))).toBeUndefined();
	});

	test("crop sits next to the conversion options", () => {
		const json = s.upload("cover").convertTo("webp").quality(80).crop("3:2").toJSON() as {
			options: { image: unknown };
		};
		expect(json.options.image).toEqual({
			convertTo: "webp",
			quality: 80,
			crop: { aspects: ["3:2"] },
		});
	});

	test("rejects a malformed or zero-sided aspect, and an empty list", () => {
		for (const bad of ["16/9", "wide", "0:1", "4:0", ""]) {
			expect(() => s.upload("cover").crop(bad as "free")).toThrow("Invalid crop aspect");
		}
		expect(() => s.upload("cover").cropAspects([])).toThrow("at least one aspect");
	});
});
