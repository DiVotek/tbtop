import { describe, expect, it } from "bun:test";
import type { AdminClient } from "../data/client";
import type { ClientActionContext, StructureNode } from "../structure/types";
import { materialize } from "./materialize";

function node(kind: string, options: Record<string, unknown>, name?: string): StructureNode {
	return { kind, options, meta: {}, ...(name ? { name } : {}) } as StructureNode;
}

function fakeCtx(overrides: Partial<ClientActionContext> = {}): ClientActionContext {
	return {
		client: {} as AdminClient,
		user: null,
		params: {},
		navigate: () => {},
		notify: () => {},
		t: (k) => k,
		...overrides,
	};
}

const BASE = { basePath: "/admin/posts", data: {} };

describe("materialize actions", () => {
	it("maps a visit spec to a url option", () => {
		const out = materialize(
			node("action", { label: "Back", spec: { type: "visit", href: "/admin" } }, "back"),
			BASE,
		);
		expect(out.options.url).toBe("/admin");
		expect(out.options.spec).toBeUndefined();
	});

	it("maps a server spec to a handler posting needs-driven payload and running effects", async () => {
		const calls: { path: string; body: unknown }[] = [];
		const notifications: string[] = [];
		const client = {
			post: async (path: string, body: unknown) => {
				calls.push({ path, body });
				return { effects: [{ kind: "notify", message: "done" }] };
			},
		} as unknown as AdminClient;

		const out = materialize(
			node("action", { spec: { type: "server", needs: ["row", "selection"] } }, "publish"),
			BASE,
		);
		const handler = out.options.handler as (ctx: ClientActionContext) => Promise<void>;
		await handler(
			fakeCtx({
				client,
				row: { id: 7 },
				table: {
					rows: [],
					selectedIds: ["1", "2"],
					queryParams: {},
					refresh: () => {},
					setQuery: () => {},
				},
				notify: (msg) => notifications.push(msg.message),
			}),
		);

		expect(calls[0]?.path).toBe("/admin/posts/actions/publish");
		expect(calls[0]?.body).toEqual({
			payload: { row: { id: 7 }, selection: ["1", "2"], params: {} },
		});
		expect(notifications).toEqual(["done"]);
	});

	it("wraps a confirmed server action into a modal with a confirm button", () => {
		const out = materialize(
			node(
				"action",
				{
					label: "Delete",
					color: "danger",
					confirm: { title: "Really?" },
					spec: { type: "server", needs: [] },
				},
				"delete",
			),
			BASE,
		);
		const modal = out.options.modal as {
			title: string;
			body: { options: { children: { options: { handler: unknown } }[] } };
		};
		expect(modal.title).toBe("Really?");
		expect(out.options.handler).toBeUndefined();
		const confirmButton = modal.body.options.children[0];
		expect(typeof confirmButton?.options.handler).toBe("function");
	});
});

describe("materialize form", () => {
	const form = node(
		"form",
		{
			name: "post",
			children: [
				node("text", { label: "Title", constraints: { required: true, max: 5 } }, "title"),
				node("action", { spec: { type: "submit" } }, "save"),
			],
		},
		"post",
	);

	it("resolves initial data from page props, not the network", async () => {
		const out = materialize(form, { ...BASE, data: { post: { title: "Hi" } } });
		const query = out.options.query as () => Promise<unknown>;
		expect(await query()).toEqual({ title: "Hi" });
	});

	it("compiles field constraints into a blur-validation schema", () => {
		const out = materialize(form, { ...BASE, data: {} });
		const schema = out.options.schema as { parse: (i: unknown) => unknown };
		expect(() => schema.parse({ title: "toolong" })).toThrow();
		expect(schema.parse({ title: "ok" })).toEqual({ title: "ok" });
	});
});

describe("materialize table", () => {
	it("queries the page-scoped endpoint with list params and unwraps the envelope", async () => {
		let captured: { path: string; query: unknown } | null = null;
		const client = {
			get: async (path: string, query: unknown) => {
				captured = { path, query };
				return { data: { data: [{ id: 1 }], total: 1 } };
			},
		} as unknown as AdminClient;

		const out = materialize(
			node("table", { columns: [{ name: "title" }], rowActions: [] }, "posts"),
			BASE,
		);
		const query = out.options.query as (ctx: ClientActionContext) => Promise<unknown>;
		const result = await query(
			fakeCtx({
				client,
				table: {
					rows: [],
					selectedIds: [],
					queryParams: { page: 2, sort: "title:desc", filters: { published: 1 } },
					refresh: () => {},
					setQuery: () => {},
				},
			}),
		);

		expect(captured?.path).toBe("/admin/posts/tables/posts");
		expect(captured?.query).toMatchObject({
			page: 2,
			sort: "title",
			dir: "desc",
			"filters[published]": 1,
		});
		expect(result).toEqual({ data: [{ id: 1 }], total: 1 });
	});
});
