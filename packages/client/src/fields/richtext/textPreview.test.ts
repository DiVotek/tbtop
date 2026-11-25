import { describe, expect, it } from "bun:test";
import { lexicalToPlainText, serializeRichtext } from "./textPreview";

describe("serializeRichtext", () => {
	const documentOf = (children: unknown[]) => ({ root: { type: "root", children } });

	it("sends no content for a blank formatted block", () => {
		const state = documentOf([{ type: "heading", children: [{ type: "text", text: " " }] }]);
		expect(serializeRichtext(state)).toBeNull();
	});

	it("keeps embeds, text and legacy HTML", () => {
		const embed = documentOf([{ type: "embed", kind: "callout" }]);
		const text = documentOf([{ type: "paragraph", children: [{ type: "text", text: "Hi" }] }]);
		expect(serializeRichtext(embed)).toBe(embed);
		expect(serializeRichtext(text)).toBe(text);
		expect(serializeRichtext("<p>Hi</p>")).toBe("<p>Hi</p>");
	});
});

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
