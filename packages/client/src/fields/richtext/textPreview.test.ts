import { describe, expect, it } from "bun:test";
import { lexicalToPlainText } from "./textPreview";

describe("lexicalToPlainText", () => {
	it("extracts text from a single paragraph", () => {
		const state = {
			root: {
				type: "root",
				children: [
					{
						type: "paragraph",
						children: [{ type: "text", text: "Hello world" }],
					},
				],
			},
		};
		expect(lexicalToPlainText(state)).toBe("Hello world");
	});

	it("joins text across multiple blocks with spaces", () => {
		const state = {
			root: {
				type: "root",
				children: [
					{ type: "paragraph", children: [{ type: "text", text: "First" }] },
					{ type: "paragraph", children: [{ type: "text", text: "Second" }] },
				],
			},
		};
		expect(lexicalToPlainText(state)).toBe("First Second");
	});

	it("concatenates adjacent inline text nodes without adding spaces", () => {
		const state = {
			root: {
				type: "root",
				children: [
					{
						type: "paragraph",
						children: [
							{ type: "text", text: "hel" },
							{ type: "text", text: "lo " },
							{ type: "link", children: [{ type: "text", text: "world" }] },
						],
					},
				],
			},
		};
		expect(lexicalToPlainText(state)).toBe("hello world");
	});

	it("returns empty string for null", () => {
		expect(lexicalToPlainText(null)).toBe("");
	});

	it("returns empty string for non-object", () => {
		expect(lexicalToPlainText("not-lexical")).toBe("");
	});

	it("returns empty string when root is missing", () => {
		expect(lexicalToPlainText({})).toBe("");
	});

	it("returns empty string when root has no children", () => {
		expect(lexicalToPlainText({ root: { type: "root" } })).toBe("");
	});
});
