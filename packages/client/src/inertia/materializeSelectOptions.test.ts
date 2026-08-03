import { describe, expect, it } from "bun:test";
import type { AdminClient } from "../data/client";
import type { ClientActionContext, StructureNode } from "../structure/types";
import { materialize } from "./materialize";

function node(kind: string, options: Record<string, unknown>, name?: string): StructureNode {
	return { kind, options, meta: {}, ...(name ? { name } : {}) } as StructureNode;
}

interface PostCall {
	url: string;
	body: unknown;
}

function ctxPosting(response: unknown, calls: PostCall[]): ClientActionContext {
	return {
		client: {
			post: (url: string, body: unknown) => {
				calls.push({ url, body });
				return Promise.resolve(response);
			},
		} as unknown as AdminClient,
		user: null,
		params: {},
		navigate: () => {},
		notify: () => {},
		t: (k) => k,
	};
}

const BASE = { basePath: "/admin/posts", data: {} };

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

function selectOpts(async: boolean): Record<string, unknown> {
	return materialize(node("select", { label: "Author", async }, "author_id"), BASE)
		.options as Record<string, unknown>;
}

describe("Materialize: select-options endpoint", () => {
	it("Materialize: an async select gets a query bound to the select-options endpoint", async () => {
		const calls: PostCall[] = [];
		const opts = selectOpts(true);

		const rows = await (opts.query as QueryFn)(
			ctxPosting({ options: [{ value: "1", label: "Alice" }] }, calls),
			"ali",
			{ team: "7" },
		);

		expect(calls).toEqual([
			{
				url: "/admin/posts/select-options/author_id",
				body: { search: "ali", deps: { team: "7" } },
			},
		]);
		expect(rows).toEqual([{ value: "1", label: "Alice" }]);
	});

	it("Materialize: an async select resolves a stored value through onLoad", async () => {
		const calls: PostCall[] = [];
		const opts = selectOpts(true);

		const option = await (opts.onLoad as LoadFn)(
			ctxPosting({ option: { value: "2", label: "Bob" } }, calls),
			"2",
		);

		expect(calls[0]?.body).toEqual({ value: "2", deps: undefined });
		expect(option).toEqual({ value: "2", label: "Bob" });
	});

	it("Materialize: onLoad rejects when the server resolves nothing", async () => {
		const opts = selectOpts(true);

		const attempt = (opts.onLoad as LoadFn)(ctxPosting({ option: null }, []), "999");

		expect(attempt).rejects.toThrow("not found");
	});

	// A static select must keep rendering from its wire `options` array; injecting
	// a query would flip it to the async branch and blank the list.
	it("Materialize: a select without the async flag gets no query", () => {
		const opts = selectOpts(false);

		expect(opts.query).toBeUndefined();
		expect(opts.onLoad).toBeUndefined();
	});
});
