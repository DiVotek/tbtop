import { describe, expect, it } from "bun:test";
import { compileConstraints } from "./constraints";

function validate(byField: Parameters<typeof compileConstraints>[0], input: unknown): unknown {
	return compileConstraints(byField).parse(input);
}

function errors(byField: Parameters<typeof compileConstraints>[0], input: unknown): string[] {
	try {
		validate(byField, input);
		return [];
	} catch (e) {
		return (e as { issues: { message: string }[] }).issues.map((i) => i.message);
	}
}

describe("compileConstraints max size", () => {
	it("counts array items, not the stringified length, for max", () => {
		// Regression (M-77): a 1-item repeater under max:10 was rejected
		// because String([{...}]) === "[object Object]" (15 chars) > 10.
		const schema = { sections: { max: 10 } };
		const oneItem = { sections: [{ heading: "Intro", body: "..." }] };
		expect(errors(schema, oneItem)).toEqual([]);
	});

	it("rejects an array that exceeds max by item count", () => {
		const schema = { sections: { max: 2 } };
		const tooMany = { sections: [{}, {}, {}] };
		expect(errors(schema, tooMany)).toEqual(["Must be at most 2"]);
	});

	it("counts array items for min", () => {
		const schema = { sections: { min: 2 } };
		expect(errors(schema, { sections: [{}] })).toEqual(["Must be at least 2"]);
		expect(errors(schema, { sections: [{}, {}] })).toEqual([]);
	});

	it("still measures strings by character length", () => {
		const schema = { title: { max: 5 } };
		expect(errors(schema, { title: "abcdef" })).toEqual(["Must be at most 5"]);
		expect(errors(schema, { title: "abc" })).toEqual([]);
	});

	it("still measures numbers by value", () => {
		const schema = { qty: { max: 10, min: 1 } };
		expect(errors(schema, { qty: 11 })).toEqual(["Must be at most 10"]);
		expect(errors(schema, { qty: 0 })).toEqual(["Must be at least 1"]);
		expect(errors(schema, { qty: 5 })).toEqual([]);
	});
});
