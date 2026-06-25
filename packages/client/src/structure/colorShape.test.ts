import { describe, expect, test } from "bun:test";
import { colorShapeClass } from "./colorShape";

describe("colorShapeClass", () => {
	test("undefined defaults to rounded (rounded-md)", () => {
		expect(colorShapeClass(undefined)).toBe("rounded-md");
	});

	test("'square' maps to rounded-none", () => {
		expect(colorShapeClass("square")).toBe("rounded-none");
	});

	test("'rounded' maps to rounded-md", () => {
		expect(colorShapeClass("rounded")).toBe("rounded-md");
	});

	test("'circular' maps to rounded-full", () => {
		expect(colorShapeClass("circular")).toBe("rounded-full");
	});
});
