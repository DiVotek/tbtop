/**
 * Scenario 7: filter field hiddenIf compiled through the materialize walk.
 * Proves that the `filters` subtree goes through the same meta-compilation
 * as form children and repeater fields.
 */
import { describe, expect, it } from "bun:test";
import type { ConditionContext, StructureNode } from "../structure/types";
import { materialize } from "./materialize";

function serverNode(
	kind: string,
	options: Record<string, unknown>,
	name: string,
	meta: Record<string, unknown> = {},
): StructureNode {
	return { kind, options, meta, name } as unknown as StructureNode;
}

const BASE = { basePath: "/admin/posts", data: {} };

describe("MaterializeTableFilters: hiddenIf on filter fields", () => {
	it("MaterializeTableFilters: filter node hiddenIf is compiled to a ConditionFn", () => {
		const filterWithCondition = serverNode("text", { label: "Author" }, "author", {
			hiddenIf: { op: "neq", field: "type", value: "article" },
		});
		const tableNode = serverNode(
			"table",
			{
				columns: [{ name: "title" }],
				filters: [
					serverNode("select", { label: "Type", options: [] }, "type"),
					filterWithCondition,
				],
			},
			"posts",
		);

		const out = materialize(tableNode, BASE);
		const opts = out.options as Record<string, unknown>;
		const compiledFilters = opts.filters as StructureNode[];

		expect(compiledFilters).toHaveLength(2);

		const compiledAuthor = compiledFilters[1];
		expect(compiledAuthor).toBeTruthy();

		// The meta.hidden should be a function (compiled ConditionFn)
		const hiddenFn = compiledAuthor?.meta?.hidden;
		expect(typeof hiddenFn).toBe("function");
	});

	it("MaterializeTableFilters: compiled hidden fn resolves correctly", () => {
		const filterWithCondition = serverNode("text", { label: "Author" }, "author", {
			hiddenIf: { op: "eq", field: "type", value: "news" },
		});
		const tableNode = serverNode(
			"table",
			{
				columns: [{ name: "title" }],
				filters: [filterWithCondition],
			},
			"posts",
		);

		const out = materialize(tableNode, BASE);
		const opts = out.options as Record<string, unknown>;
		const filters = opts.filters as StructureNode[];
		const hiddenFn = filters[0]?.meta?.hidden;

		if (typeof hiddenFn !== "function") {
			throw new Error("hiddenFn should be a function");
		}

		const ctxNews: ConditionContext = { record: undefined, data: { type: "news" }, user: null };
		const ctxArticle: ConditionContext = {
			record: undefined,
			data: { type: "article" },
			user: null,
		};

		// type=news → hidden (condition matches)
		expect(hiddenFn(ctxNews)).toBe(true);
		// type=article → not hidden
		expect(hiddenFn(ctxArticle)).toBe(false);
	});
});
