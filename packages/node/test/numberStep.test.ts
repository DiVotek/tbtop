import { describe, expect, test } from "bun:test";
import { S } from "../src";

const step = (value: number | string) =>
	(
		JSON.parse(JSON.stringify(new S().number("price").step(value))) as {
			options: { step: unknown };
		}
	).options.step;

describe("Number::step()", () => {
	test("a numeric string ships as a number, like Column::step()", () => {
		expect(step("0.01")).toBe(0.01);
		expect(step(5)).toBe(5);
		expect(step("any")).toBe("any");
	});

	test("anything else throws", () => {
		expect(() => step("big")).toThrow(
			'Number::step() only accepts a number, a numeric string or "any".',
		);
		expect(() => step("")).toThrow();
	});
});
