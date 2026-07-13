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
		expect(errors(schema, tooMany)).toEqual(["validation.max:2"]);
	});

	it("counts array items for min", () => {
		const schema = { sections: { min: 2 } };
		expect(errors(schema, { sections: [{}] })).toEqual(["validation.min:2"]);
		expect(errors(schema, { sections: [{}, {}] })).toEqual([]);
	});

	it("still measures strings by character length", () => {
		const schema = { title: { max: 5 } };
		expect(errors(schema, { title: "abcdef" })).toEqual(["validation.max:5"]);
		expect(errors(schema, { title: "abc" })).toEqual([]);
	});

	it("still measures numbers by value", () => {
		const schema = { qty: { max: 10, min: 1 } };
		expect(errors(schema, { qty: 11 })).toEqual(["validation.max:10"]);
		expect(errors(schema, { qty: 0 })).toEqual(["validation.min:1"]);
		expect(errors(schema, { qty: 5 })).toEqual([]);
	});
});

describe("compileConstraints message keys (i18n)", () => {
	it("required emits the validation.required key, not literal English text", () => {
		const schema = { title: { required: true } };
		expect(errors(schema, { title: "" })).toEqual(["validation.required"]);
	});

	it("email emits the validation.email key", () => {
		const schema = { email: { email: true } };
		expect(errors(schema, { email: "not-an-email" })).toEqual(["validation.email"]);
	});

	it("integer emits the validation.integer key", () => {
		const schema = { qty: { integer: true } };
		expect(errors(schema, { qty: "1.5" })).toEqual(["validation.integer"]);
	});

	it("regex emits the validation.regex key", () => {
		const schema = { slug: { regex: "^[a-z]+$" } };
		expect(errors(schema, { slug: "Not Valid" })).toEqual(["validation.regex"]);
	});

	it("in emits the validation.in key", () => {
		const schema = { role: { in: ["admin", "editor"] } };
		expect(errors(schema, { role: "superuser" })).toEqual(["validation.in"]);
	});
});
