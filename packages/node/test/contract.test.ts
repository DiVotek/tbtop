import { describe, expect, test } from "bun:test";
import Ajv2020 from "ajv/dist/2020";
import schema from "../../contracts/structure.schema.json";
import { driver, pages } from "../example/posts";
import { createAdmin } from "../src";

const validateNode = new Ajv2020({ strict: false }).compile(schema);

describe("wire contract (the PHP package's own schema)", () => {
	const admin = createAdmin({ prefix: "/admin", pages, driver });

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
