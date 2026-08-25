/**
 * Scenario 7: filter field hiddenIf compiled through the materialize walk.
 * Proves that the `filters` subtree goes through the same meta-compilation
 * as form children and repeater fields.
 */
import { describe, expect, it } from "bun:test";
import type { AdminClient } from "../data/client";
import type { ClientActionContext, ConditionContext, StructureNode } from "../structure/types";
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
			throw new TypeError("hiddenFn should be a function");
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

interface PostCall {
	url: string;
	body: unknown;
}

type QueryFn = (
	ctx: ClientActionContext,
	search: string,
	deps?: Record<string, string>,
) => Promise<unknown>;
type LoadFn = (
	ctx: ClientActionContext,
	value: string,
	deps?: Record<string, string>,
) => Promise<unknown>;
type MultiLoadFn = (
	ctx: ClientActionContext,
	values: string[],
	deps?: Record<string, string>,
) => Promise<unknown>;

function postingContext(calls: PostCall[]): ClientActionContext {
	return {
		client: {
			post: (url: string, body: unknown) => {
				calls.push({ url, body });
				if (body !== null && typeof body === "object" && "value" in body) {
					return Promise.resolve({ option: { value: "fr", label: "France" } });
				}
				return Promise.resolve({ options: [{ value: "fr", label: "France" }] });
			},
		} as unknown as AdminClient,
		user: null,
		params: {},
		navigate: () => {},
		notify: () => {},
		t: (key) => key,
	};
}

describe("MaterializeTableFilters: scoped async options", () => {
	it("binds only filter selects to their table URL and preserves the form URL", async () => {
		const form = serverNode(
			"form",
			{
				children: [serverNode("select", { async: true }, "country")],
			},
			"main",
		);
		const primary = serverNode(
			"table",
			{
				columns: [],
				filters: [
					serverNode("select", { async: true }, "country"),
					serverNode("select", { async: true, multiple: true }, "tags"),
				],
			},
			"primary",
		);
		const secondary = serverNode(
			"table",
			{
				columns: [],
				filters: [serverNode("select", { async: true }, "country")],
			},
			"secondary",
		);
		const root = serverNode("stack", { children: [form, primary, secondary] }, "root");
		const out = materialize(root, BASE);
		const children = (out.options as { children: StructureNode[] }).children;
		const formChildren = (children[0] as StructureNode).options as {
			children: StructureNode[];
		};
		const formSelect = (formChildren.children[0] as StructureNode).options as Record<
			string,
			unknown
		>;
		const primaryFilters = (
			(children[1] as StructureNode).options as {
				filters: StructureNode[];
			}
		).filters;
		const secondaryFilters = (
			(children[2] as StructureNode).options as {
				filters: StructureNode[];
			}
		).filters;
		const primaryCountry = primaryFilters[0]?.options as Record<string, unknown>;
		const primaryTags = primaryFilters[1]?.options as Record<string, unknown>;
		const secondaryCountry = secondaryFilters[0]?.options as Record<string, unknown>;
		const calls: PostCall[] = [];
		const ctx = postingContext(calls);

		await (formSelect.query as QueryFn)(ctx, "form");
		await (primaryCountry.query as QueryFn)(ctx, "pri", { region: "eu" });
		await (primaryCountry.onLoad as LoadFn)(ctx, "fr");
		await (primaryTags.onLoad as MultiLoadFn)(ctx, ["t1", "t2"]);
		await (secondaryCountry.query as QueryFn)(ctx, "sec");

		expect(calls).toEqual([
			{
				url: "/admin/posts/select-options/country",
				body: { search: "form", deps: undefined },
			},
			{
				url: "/admin/posts/tables/primary/filters/country/options",
				body: { search: "pri", deps: { region: "eu" } },
			},
			{
				url: "/admin/posts/tables/primary/filters/country/options",
				body: { value: "fr", deps: undefined },
			},
			{
				url: "/admin/posts/tables/primary/filters/tags/options",
				body: { values: ["t1", "t2"], deps: undefined },
			},
			{
				url: "/admin/posts/tables/secondary/filters/country/options",
				body: { search: "sec", deps: undefined },
			},
		]);
	});
});
