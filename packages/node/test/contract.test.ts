import { describe, expect, test } from "bun:test";
import Ajv2020 from "ajv/dist/2020";
import schema from "../../contracts/structure.schema.json";
import { driver, pages } from "../example/posts";
import { createAdmin, S } from "../src";

const validateNode = new Ajv2020({ strict: false }).compile(schema);

describe("wire contract (the PHP package's own schema)", () => {
	const admin = createAdmin({ allowGuests: true, prefix: "/admin", pages, driver });

	for (const url of ["/admin/posts", "/admin/posts/new", "/admin/posts/1/edit"]) {
		test(`${url} emits a tree valid against structure.schema.json`, async () => {
			const props = await admin.pageProps(new Request(`http://x${url}`));
			if (props instanceof Response) {
				throw new TypeError(`status ${props.status}`);
			}
			expect(validateNode(props.structure)).toBe(true);
		});
	}
});

describe("per-locale placeholder (#385)", () => {
	test("text and textarea take a locale map and put it on the wire as given", () => {
		const s = new S();
		const map = { en: "Page title", uk: "Назва сторінки" };
		expect(s.text("title").placeholder(map).toJSON()).toMatchObject({
			options: { placeholder: map },
		});
		expect(s.textarea("body").placeholder("Write…").toJSON()).toMatchObject({
			options: { placeholder: "Write…" },
		});
	});

	test("a map with a non-string value is refused", () => {
		expect(() =>
			new S().text("title").placeholder({ en: 1 } as unknown as Record<string, string>),
		).toThrow("locale keys and string values");
	});
});

describe("relation creatable()", () => {
	const s = new S();

	test("serializes the mini-form and never the closure", () => {
		const node = s
			.relation("author_id")
			.query(() => null)
			.creatable([s.text("name").required()], () => ({ id: 1 }))
			.toNode() as unknown as { options: { create: { fields: { name: string }[] } } };
		expect(node.options.create.fields.map((f) => f.name)).toEqual(["name"]);
		expect(JSON.stringify(node)).not.toContain("=>");
	});

	test("rejects a mini-form field named deps", () => {
		expect(() =>
			s.relation("author_id").creatable([s.text("deps")], () => ({ id: 1 })),
		).toThrow('cannot be named "deps"');
	});
});
