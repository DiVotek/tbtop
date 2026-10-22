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

describe("compileConstraints multi-value fields", () => {
	it("checks `in` per element for arrays, not against the stringified array", () => {
		const schema = { tags: { in: ["a", "b", "c"] } };
		expect(errors(schema, { tags: ["a", "b"] })).toEqual([]);
		expect(errors(schema, { tags: ["a", "zz"] })).toEqual(["validation.in"]);
		expect(errors(schema, { tags: [] })).toEqual([]);
	});

	it("treats an empty array as missing for required", () => {
		const schema = { tags: { required: true, in: ["a", "b"] } };
		expect(errors(schema, { tags: [] })).toEqual(["validation.required"]);
		expect(errors(schema, { tags: ["a"] })).toEqual([]);
	});

	it("still applies min to an empty array that is not required", () => {
		const schema = { sections: { min: 2 } };
		expect(errors(schema, { sections: [] })).toEqual(["validation.min:2"]);
	});
});

describe("compileConstraints server-only patterns", () => {
	it("skips a regex JS cannot compile instead of throwing", () => {
		// PCRE-only syntax (possessive quantifier, inline flag group) survives
		// the server's delimiter strip; the server stays the gate.
		expect(errors({ code: { regex: "^\\d++$" } }, { code: "abc" })).toEqual([]);
		expect(errors({ code: { regex: "(?i)^[a-z]+$" } }, { code: "ABC" })).toEqual([]);
	});

	it("still reports other rules on a field whose regex is skipped", () => {
		const schema = { code: { regex: "^\\d++$", in: ["1", "2"] } };
		expect(errors(schema, { code: "3" })).toEqual(["validation.in"]);
	});
});

describe("compileConstraints integer size", () => {
	it("sizes a numeric string by value when the field is integer, like Laravel", () => {
		const schema = { qty: { integer: true, min: 10, max: 100 } };
		expect(errors(schema, { qty: "15" })).toEqual([]);
		expect(errors(schema, { qty: "5" })).toEqual(["validation.min:10"]);
		expect(errors(schema, { qty: "150" })).toEqual(["validation.max:100"]);
	});

	it("keeps sizing a non-integer field's numeric string by length", () => {
		expect(errors({ pin: { min: 4 } }, { pin: "123" })).toEqual(["validation.min:4"]);
	});
});

describe("compileConstraints url", () => {
	it("rejects a value without a scheme and authority", () => {
		const schema = { site: { url: true } };
		expect(errors(schema, { site: "example.com" })).toEqual(["validation.url"]);
		expect(errors(schema, { site: "not a url" })).toEqual(["validation.url"]);
	});

	it("accepts an absolute url", () => {
		const schema = { site: { url: true } };
		expect(errors(schema, { site: "https://example.com/path?q=1" })).toEqual([]);
	});
});
