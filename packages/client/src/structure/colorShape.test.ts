import { describe, expect, test } from "bun:test";
import { colorShapeClass } from "./colorShape";

describe("colorShapeClass", () => {
	test("undefined defaults to rounded (rounded-surface)", () => {
		expect(colorShapeClass(undefined)).toBe("rounded-surface");
	});

	test("'square' maps to rounded-none", () => {
		expect(colorShapeClass("square")).toBe("rounded-none");
	});

	test("'rounded' maps to rounded-surface", () => {
		expect(colorShapeClass("rounded")).toBe("rounded-surface");
	});

	test("'circular' maps to rounded-full", () => {
		expect(colorShapeClass("circular")).toBe("rounded-full");
	});
});
