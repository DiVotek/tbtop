import { describe, expect, it } from "bun:test";
import type { StructureNode } from "../structure/types";
import { materialize } from "./materialize";

function node(kind: string, options: Record<string, unknown>, name?: string): StructureNode {
	return { kind, options, meta: {}, ...(name ? { name } : {}) } as StructureNode;
}

const BASE = { basePath: "/admin/posts", data: {} };

describe("Materialize: create.fields walker", () => {
	it("Materialize: select create.fields hiddenIf is compiled to a ConditionFn", () => {
		const selectNode = node(
			"select",
			{
				label: "Author",
				options: [],
				create: {
					fields: [
						node("text", { label: "Name" }, "name"),
						{
							kind: "text",
							name: "bio",
							options: { label: "Bio" },
							meta: { hiddenIf: { op: "eq", field: "name", value: "" } },
						},
					],
				},
			},
			"author_id",
		);
		const formNode = node("form", { name: "post", children: [selectNode] }, "post");

		const out = materialize(formNode, BASE);
		const children = (out.options as Record<string, unknown>).children as StructureNode[];
		const compiledSelect = children[0] as StructureNode;
		const create = (compiledSelect.options as Record<string, unknown>).create as Record<
			string,
			unknown
		>;

		expect(create).toBeTruthy();
		const fields = create.fields as StructureNode[];
		expect(fields).toHaveLength(2);

		// The second field has hiddenIf — it should be compiled to a function on meta.hidden
		const bioField = fields[1];
		expect(typeof bioField?.meta?.hidden).toBe("function");
	});

	it("Materialize: select create.fields without conditions passes through unchanged", () => {
		const selectNode = node(
			"select",
			{
				label: "Author",
				options: [],
				create: {
					fields: [node("text", { label: "Name" }, "name")],
				},
			},
			"author_id",
		);
		const formNode = node("form", { name: "post", children: [selectNode] }, "post");

		const out = materialize(formNode, BASE);
		const children = (out.options as Record<string, unknown>).children as StructureNode[];
		const compiledSelect = children[0] as StructureNode;
		const create = (compiledSelect.options as Record<string, unknown>).create as Record<
			string,
			unknown
		>;
		const fields = create.fields as StructureNode[];

		// No hiddenIf — meta.hidden is absent
		expect(fields[0]?.meta?.hidden).toBeUndefined();
		expect(fields[0]?.name).toBe("name");
	});
});
