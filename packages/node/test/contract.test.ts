import { describe, expect, test } from "bun:test";
import Ajv2020 from "ajv/dist/2020";
import kitchenSink from "../../contracts/fixtures/kitchen-sink.json";
import schema from "../../contracts/structure.schema.json";
import { pages } from "../example/posts";
import { createAdmin, s, type WireNode } from "../src";

const validateNode = new Ajv2020({ strict: false }).compile(schema);

function findNamed(tree: unknown, kind: string, name: string): unknown {
	if (Array.isArray(tree)) {
		return tree.map((t) => findNamed(t, kind, name)).find(Boolean);
	}
	if (tree && typeof tree === "object") {
		const n = tree as WireNode;
		if (n.kind === kind && n.name === name) {
			return n;
		}
		return Object.values(n)
			.map((v) => findNamed(v, kind, name))
			.find(Boolean);
	}
	return undefined;
}

describe("wire contract (the PHP package's own schema and fixture)", () => {
	const admin = createAdmin({ prefix: "/admin", pages });

	for (const url of ["/admin/posts", "/admin/posts/new", "/admin/posts/1/edit"]) {
		test(`${url} emits a tree valid against structure.schema.json`, async () => {
			const props = await admin.pageProps(new Request(`http://x${url}`));
			if (props instanceof Response) {
				throw new TypeError(`status ${props.status}`);
			}
			expect(validateNode(props.structure)).toBe(true);
		});
	}

	test("the same form authored in TS serializes byte-equal to the PHP kitchen-sink", () => {
		const editPost = s.form("editPost", [
			s.text("title").label("Title").required().max(200),
			s.boolean("published").label("Published"),
			s.row([
				s
					.action("editSave")
					.label("Save")
					.color("primary")
					.needs("row", "form")
					.handle(() => {}),
				s
					.action("editCancel")
					.label("Cancel")
					.handle(() => {}),
			]),
		]);
		const createPost = s.form("createPost", [
			s.text("title").label("Title").required(),
			s.row([
				s
					.action("createStore")
					.label("Create")
					.color("primary")
					.needs("form")
					.handle(() => {}),
				s
					.action("createCancel")
					.label("Cancel")
					.handle(() => {}),
			]),
		]);
		for (const form of [editPost, createPost]) {
			const php = findNamed(kitchenSink, "form", form.name);
			expect(JSON.parse(JSON.stringify(form.toNode()))).toEqual(php as object);
		}
	});
});
