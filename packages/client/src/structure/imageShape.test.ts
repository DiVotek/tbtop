import { describe, expect, test } from "bun:test";
import { imageShapeClass } from "./imageShape";

describe("imageShapeClass", () => {
	test("undefined defaults to square (rounded-none)", () => {
		expect(imageShapeClass(undefined)).toBe("rounded-none");
	});

	test("'square' maps to rounded-none", () => {
		expect(imageShapeClass("square")).toBe("rounded-none");
	});

	test("'circular' maps to rounded-full", () => {
		expect(imageShapeClass("circular")).toBe("rounded-full");
	});

	test("'rounded' maps to rounded-lg", () => {
		expect(imageShapeClass("rounded")).toBe("rounded-lg");
	});
});
