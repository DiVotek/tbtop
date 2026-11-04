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

describe("inputMode on Text and Number", () => {
	const s = new S();

	test("emits the option only when set, valid against the schema", () => {
		const form = s.form("pricing", [
			s.text("price").inputMode("decimal"),
			s.text("phone").mask("(999) 999-9999").inputMode("tel"),
			s.text("title"),
			s.number("quantity").inputMode("numeric"),
		]);
		const json = JSON.parse(JSON.stringify(form));
		expect(validateNode(json)).toBe(true);
		const opts = json.options.children.map(
			(c: { options: Record<string, unknown> }) => c.options,
		);
		expect(opts[0].inputMode).toBe("decimal");
		expect(opts[1].inputMode).toBe("tel");
		expect(opts[2]).not.toHaveProperty("inputMode");
		expect(opts[3].inputMode).toBe("numeric");
	});

	test("rejects a value the schema does not allow", () => {
		expect(() => s.number("price").inputMode("digits" as never)).toThrow(
			'Number::inputMode() expects one of none, text, decimal, numeric, tel, search, email, url, got "digits".',
		);
	});
});
