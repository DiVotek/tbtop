import { describe, expect, test } from "bun:test";
import { s } from "./structure";

interface PostPatchJson {
	title: string;
	body: string;
}

describe("structure field-name type-check via callback form", () => {
	test("structure form callback narrows field name to keys of the bound shape", () => {
		const node = s.form<PostPatchJson>({ handler: async () => {} } as never, (sf) => [
			sf.text({ name: "title" }),
			sf.text({ name: "body" }),
		]);
		const children = (node.options as { children: { name?: string }[] }).children;
		expect(children.map((c) => c.name)).toEqual(["title", "body"]);
	});

	test("structure form callback rejects a typo name at build time", () => {
		s.form<PostPatchJson>({} as never, (sf) => [
			// @ts-expect-error name "titel" is not a key of PostPatchJson
			sf.text({ name: "titel" }),
		]);
	});

	test("structure form array form still accepts any string name", () => {
		const node = s.form({} as never, [s.text({ name: "freeformName" })]);
		expect(node.kind).toBe("form");
	});

	test("structure form callback narrows name for textarea and password", () => {
		s.form<PostPatchJson>({} as never, (sf) => [
			sf.textarea({ name: "body" }),
			// @ts-expect-error name "wrong" is not a key of PostPatchJson
			sf.textarea({ name: "wrong" }),
			// @ts-expect-error password requires a key of the bound shape
			sf.password({ name: "missingKey" }),
		]);
	});
});

describe("structure helper-block type checks", () => {
	test("structure heading rejects level 1 at build time", () => {
		// @ts-expect-error level 1 is excluded — page chrome owns <h1>
		s.heading({ text: "X", level: 1 });
	});

	test("structure heading rejects level 5 at build time", () => {
		// @ts-expect-error level narrows to 2 | 3 | 4
		s.heading({ text: "X", level: 5 });
	});

	test("structure divider rejects extra option keys beyond NodeMeta", () => {
		// @ts-expect-error divider accepts only NodeMeta — text is not a valid key
		s.divider({ text: "X" });
	});

	test("structure description requires a text key", () => {
		// @ts-expect-error description requires text
		s.description({});
	});
});

describe("structure action discriminated-union type checks", () => {
	test("action accepts a handler config", () => {
		s.action({ name: "save", handler: () => {} });
	});

	test("action accepts a url config", () => {
		s.action({ name: "edit", url: "/edit" });
	});

	test("action accepts a modal config", () => {
		s.action({
			name: "delete",
			modal: {
				title: "Delete?",
				body: (sb) => sb.row([sb.action({ name: "cancel", url: "/" })]),
			},
		});
	});

	test("action rejects combining handler and url", () => {
		expect(() =>
			// @ts-expect-error url cannot coexist with handler
			s.action({ name: "x", handler: () => {}, url: "/" }),
		).toThrow();
	});

	test("action rejects combining handler and modal", () => {
		expect(() =>
			// @ts-expect-error modal cannot coexist with handler
			s.action({ name: "x", handler: () => {}, modal: { title: "T" } }),
		).toThrow();
	});

	test("action rejects combining url and modal", () => {
		expect(() =>
			// @ts-expect-error modal cannot coexist with url
			s.action({ name: "x", url: "/", modal: { title: "T" } }),
		).toThrow();
	});

	test("modal body callback narrows builder to StructureBuilders", () => {
		s.action({
			name: "x",
			modal: {
				title: "T",
				body: (sb) => sb.row([sb.action({ name: "cancel", url: "/" })]),
			},
		});
	});
});
