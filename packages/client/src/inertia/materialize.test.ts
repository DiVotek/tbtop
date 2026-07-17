import { describe, expect, it, mock } from "bun:test";
import * as inertiaReact from "@inertiajs/react";
import type { AdminClient } from "../data/client";
import { registerFields } from "../render/registerFields";
import type { ClientActionContext, StructureNode } from "../structure/types";
import { materialize } from "./materialize";

// materializeActions' submitHandler calls router.post directly. bun's
// mock.module is process-global, so spread the real module and override only
// router (mirroring inertia/AdminPageContent.test.tsx) to avoid leaking a
// prop-dropping stub for Link/usePage/etc. into other test files.
let postImpl: (
	url: string,
	data: unknown,
	options: { onSuccess?: () => void; onError?: (errors: Record<string, string>) => void },
) => void = () => {};

mock.module("@inertiajs/react", () => ({
	...inertiaReact,
	router: {
		post: (url: string, data: unknown, options: Record<string, unknown>) =>
			postImpl(url, data, options as never),
		on: mock(() => () => {}),
	},
}));

function node(kind: string, options: Record<string, unknown>, name?: string): StructureNode {
	return { kind, options, meta: {}, ...(name ? { name } : {}) } as StructureNode;
}

function opts(n: StructureNode): Record<string, unknown> {
	return n.options as Record<string, unknown>;
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
		expect(opts(out).url).toBe("/admin");
		expect(opts(out).spec).toBeUndefined();
	});

	it("carries newTab from a visit spec to the url option", () => {
		const out = materialize(
			node(
				"action",
				{ label: "Site", spec: { type: "visit", href: "https://x.test", newTab: true } },
				"site",
			),
			BASE,
		);
		expect(opts(out).url).toBe("https://x.test");
		expect(opts(out).newTab).toBe(true);
	});

	it("marks a server action without needs:['form'] as consumesForm:false (Cancel must skip pre-flight)", () => {
		const out = materialize(
			node("action", { spec: { type: "server", needs: [] } }, "cancel"),
			BASE,
		);
		expect(opts(out).consumesForm).toBe(false);
	});

	it("marks form-consuming actions as consumesForm:true (server needs:['form'] and submit)", () => {
		const server = materialize(
			node("action", { spec: { type: "server", needs: ["form"] } }, "save"),
			BASE,
		);
		expect(opts(server).consumesForm).toBe(true);

		const submit = materialize(node("action", { spec: { type: "submit" } }, "save"), BASE);
		expect(opts(submit).consumesForm).toBe(true);
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
		const handler = opts(out).handler as (ctx: ClientActionContext) => Promise<void>;
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

	it("marks the form clean before applying effects, so a redirect after save does not hit the unsaved guard", async () => {
		// Regression: a create-modal save that returns closeModal+redirect left
		// the form controller dirty. A redirect effect is a plain GET router.visit,
		// so the unsaved-changes guard saw isDirty=true and threw up a native
		// "leave site?"/confirm prompt right after a successful save. The guard
		// reads form.isDirty at visit time, so form.reset() must run first.
		const client = {
			post: async () => ({
				effects: [{ kind: "closeModal" }],
			}),
		} as unknown as AdminClient;

		const calls: string[] = [];
		const out = materialize(
			node("action", { spec: { type: "server", needs: ["form"] } }, "save"),
			BASE,
		);
		const handler = opts(out).handler as (ctx: ClientActionContext) => Promise<void>;

		await handler(
			fakeCtx({
				client,
				form: {
					initial: { title: "Old" },
					data: { title: "New" },
					isDirty: true,
					isValid: true,
					changedFields: ["title"],
					set: () => {},
					reset: () => calls.push("reset"),
					setFieldError: () => {},
				},
				modal: { close: () => calls.push("closeModal"), closeAll: () => {} },
			}),
		);

		expect(calls.indexOf("reset")).toBe(0);
		expect(calls.indexOf("closeModal")).toBe(1);
	});

	it("does NOT reset the form when the action never consumed form data", async () => {
		// A row/page server action on a page that also renders a form must not
		// wipe the user's unsaved input on success — only actions whose needs
		// include "form" mark the form clean.
		const client = {
			post: async () => ({ effects: [] }),
		} as unknown as AdminClient;

		const calls: string[] = [];
		const out = materialize(
			node("action", { spec: { type: "server", needs: ["row"] } }, "rowThing"),
			BASE,
		);
		const handler = opts(out).handler as (ctx: ClientActionContext) => Promise<void>;

		await handler(
			fakeCtx({
				client,
				row: { id: "1" },
				form: {
					initial: { title: "Old" },
					data: { title: "New" },
					isDirty: true,
					isValid: true,
					changedFields: ["title"],
					set: () => {},
					reset: () => calls.push("reset"),
					setFieldError: () => {},
				},
			}),
		);

		expect(calls).not.toContain("reset");
	});

	// Audit 5.20: a server action that catches a ValidationException and
	// returns Effects::haltModal(...) (a 200 with effects, not a thrown
	// error) means the modal stays open so the user can fix their input —
	// resetting the form right before that banner renders would erase what
	// they typed.
	it("does NOT reset the form when the response carries a haltModal effect, even though needs includes form", async () => {
		const client = {
			post: async () => ({ effects: [{ kind: "haltModal", message: "Name already taken" }] }),
		} as unknown as AdminClient;

		const calls: string[] = [];
		const out = materialize(
			node("action", { spec: { type: "server", needs: ["form"] } }, "save"),
			BASE,
		);
		const handler = opts(out).handler as (ctx: ClientActionContext) => Promise<void>;

		await handler(
			fakeCtx({
				client,
				form: {
					initial: {},
					data: { title: "My unsaved input" },
					isDirty: true,
					isValid: true,
					changedFields: ["title"],
					set: () => {},
					reset: () => calls.push("reset"),
					setFieldError: () => {},
				},
			}),
		);

		expect(calls).not.toContain("reset");
	});

	it("still resets the form on a plain success (no haltModal) when needs includes form", async () => {
		const client = {
			post: async () => ({ effects: [{ kind: "closeModal" }] }),
		} as unknown as AdminClient;

		const calls: string[] = [];
		const out = materialize(
			node("action", { spec: { type: "server", needs: ["form"] } }, "save"),
			BASE,
		);
		const handler = opts(out).handler as (ctx: ClientActionContext) => Promise<void>;

		await handler(
			fakeCtx({
				client,
				form: {
					initial: {},
					data: { title: "Saved" },
					isDirty: true,
					isValid: true,
					changedFields: ["title"],
					set: () => {},
					reset: () => calls.push("reset"),
					setFieldError: () => {},
				},
			}),
		);

		expect(calls).toContain("reset");
	});

	it("serializes upload preview objects for server actions that need form data", async () => {
		registerFields();
		const calls: { path: string; body: unknown }[] = [];
		const client = {
			post: async (path: string, body: unknown) => {
				calls.push({ path, body });
				return { effects: [] };
			},
		} as unknown as AdminClient;
		const form = materialize(
			node(
				"form",
				{
					name: "post",
					children: [
						node("upload", { label: "Cover" }, "cover"),
						node("action", { spec: { type: "server", needs: ["form"] } }, "save"),
					],
				},
				"post",
			),
			BASE,
		);
		const children = opts(form).children as StructureNode[];
		const save = children.find((child) => child.name === "save") as StructureNode;
		const handler = opts(save).handler as (ctx: ClientActionContext) => Promise<void>;

		await handler(
			fakeCtx({
				client,
				form: {
					initial: {},
					data: { cover: { path: "uploads/a.png", url: "/storage/uploads/a.png" } },
					isDirty: true,
					isValid: true,
					changedFields: ["cover"],
					set: () => {},
					reset: () => {},
					setFieldError: () => {},
				},
			}),
		);

		expect(calls[0]?.path).toBe("/admin/posts/actions/save");
		expect(calls[0]?.body).toEqual({
			payload: { form: { cover: "uploads/a.png" }, params: {} },
		});
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
		const modal = opts(out).modal as {
			title: string;
			body: { options: { children: { options: { handler: unknown } }[] } };
		};
		expect(modal.title).toBe("Really?");
		expect(opts(out).handler).toBeUndefined();
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
		const query = opts(out).query as () => Promise<unknown>;
		expect(await query()).toEqual({ title: "Hi" });
	});

	it("compiles field constraints into a blur-validation schema", () => {
		const out = materialize(form, { ...BASE, data: {} });
		const schema = opts(out).schema as { parse: (i: unknown) => unknown };
		expect(() => schema.parse({ title: "toolong" })).toThrow();
		expect(schema.parse({ title: "ok" })).toEqual({ title: "ok" });
	});

	it("flags the submit action's bag so the button can render type=submit", () => {
		const mixed = node(
			"form",
			{
				name: "post",
				children: [
					node("text", {}, "title"),
					node("action", { spec: { type: "visit", href: "/admin" } }, "back"),
					node("action", { spec: { type: "submit" } }, "save"),
				],
			},
			"post",
		);
		const out = materialize(mixed, { ...BASE, data: {} });
		const children = opts(out).children as StructureNode[];
		const back = children.find((c) => c.name === "back") as StructureNode;
		const save = children.find((c) => c.name === "save") as StructureNode;
		expect(opts(save).isSubmit).toBe(true);
		expect(opts(back).isSubmit).toBeUndefined();
	});

	it("marks the form clean before resolving, so a redirect flash effect after save does not hit the unsaved guard", async () => {
		// Regression, submit-path counterpart to the serverHandler fix above:
		// router.post's onSuccess resolves the action promise, but the server's
		// back() response carries flash effects (executed in AdminPage's
		// useEffect, with no form in context) that can include a redirect —
		// a plain GET router.visit. useUnsavedGuard reads form.isDirty at visit
		// time, so if the form controller is still dirty when that GET fires,
		// the user sees a native "leave site?" confirm right after a successful
		// save. form.reset() must run before the promise resolves.
		postImpl = (_url, _data, options) => {
			options.onSuccess?.();
		};

		const calls: string[] = [];
		const out = materialize(form, { ...BASE, data: {} });
		const children = opts(out).children as StructureNode[];
		const save = children.find((c) => c.name === "save") as StructureNode;
		const handler = opts(save).handler as (ctx: ClientActionContext) => Promise<void>;

		await handler(
			fakeCtx({
				form: {
					initial: { title: "Old" },
					data: { title: "New" },
					isDirty: true,
					isValid: true,
					changedFields: ["title"],
					set: () => {},
					reset: () => calls.push("reset"),
					setFieldError: () => {},
				},
			}),
		);

		expect(calls).toEqual(["reset"]);
	});
});

describe("materialize chart", () => {
	it("queries the data endpoint without params for a zero-param chart", async () => {
		let captured = null as { path: string; query: unknown } | null;
		const client = {
			get: async (path: string, query: unknown) => {
				captured = { path, query };
				return { data: [{ x: 1 }] };
			},
		} as unknown as AdminClient;

		const out = materialize(node("chart:bar", { source: "byMonth" }, "byMonth"), BASE);
		const query = opts(out).query as (
			ctx: ClientActionContext,
			params?: Record<string, string>,
		) => Promise<unknown>;
		await query(fakeCtx({ client }));

		expect(captured?.path).toBe("/admin/posts/data/byMonth");
		expect(captured?.query).toEqual({});
	});

	it("passes declared param values as query args to the data endpoint", async () => {
		let captured = null as { path: string; query: unknown } | null;
		const client = {
			get: async (path: string, query: unknown) => {
				captured = { path, query };
				return { data: [] };
			},
		} as unknown as AdminClient;

		const out = materialize(node("chart:bar", { source: "byInterval" }, "byInterval"), BASE);
		const query = opts(out).query as (
			ctx: ClientActionContext,
			params?: Record<string, string>,
		) => Promise<unknown>;
		await query(fakeCtx({ client }), { interval: "month", from: "2024-01-01" });

		expect(captured?.path).toBe("/admin/posts/data/byInterval");
		expect(captured?.query).toEqual({ interval: "month", from: "2024-01-01" });
	});
});

describe("materialize stat", () => {
	it("injects a query hitting the encoded data endpoint when source is present", async () => {
		let captured = null as string | null;
		const client = {
			get: async (path: string) => {
				captured = path;
				return { data: { value: 7 } };
			},
		} as unknown as AdminClient;

		const out = materialize(
			node("stat", { label: "Active users", value: 5, poll: 10, source: "Active users" }),
			BASE,
		);
		const query = opts(out).query as (ctx: ClientActionContext) => Promise<unknown>;
		const result = await query(fakeCtx({ client }));

		expect(captured).toBe("/admin/posts/data/Active%20users");
		expect(result).toEqual({ value: 7 });
	});

	it("leaves a stat without source untouched (no query injected)", () => {
		const out = materialize(node("stat", { label: "Plain", value: 5 }), BASE);

		expect(opts(out).query).toBeUndefined();
		expect(opts(out).value).toBe(5);
	});
});

describe("materialize table", () => {
	it("queries the page-scoped endpoint with list params and unwraps the envelope", async () => {
		let captured = null as { path: string; query: unknown } | null;
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
		const query = opts(out).query as (ctx: ClientActionContext) => Promise<unknown>;
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

	it("injects a reorderRows closure that posts the id order and unwraps effects", async () => {
		let captured = null as { path: string; body: unknown } | null;
		const client = {
			post: async (path: string, body: unknown) => {
				captured = { path, body };
				return { effects: [{ kind: "refreshTable", table: "posts" }] };
			},
		} as unknown as AdminClient;

		const out = materialize(node("table", { columns: [{ name: "title" }] }, "posts"), BASE);
		const reorderRows = opts(out).reorderRows as (
			ctx: ClientActionContext,
			ids: string[],
		) => Promise<unknown>;
		const effects = await reorderRows(fakeCtx({ client }), ["3", "1", "2"]);

		expect(captured?.path).toBe("/admin/posts/tables/posts/reorder");
		expect(captured?.body).toEqual({ ids: ["3", "1", "2"] });
		expect(effects).toEqual([{ kind: "refreshTable", table: "posts" }]);
	});
});

describe("materialize upload", () => {
	it("injects an upload closure that posts the file to the page-scoped endpoint", async () => {
		let captured = null as { path: string; formData: FormData } | null;
		const client = {
			upload: async (path: string, formData: FormData) => {
				captured = { path, formData };
				return { data: { path: "u1", url: "/u/u1" } };
			},
		} as unknown as AdminClient;

		const out = materialize(node("upload", { accept: "image/*" }, "cover"), BASE);
		const upload = opts(out).upload as (
			ctx: ClientActionContext,
			file: File,
			signal?: AbortSignal,
		) => Promise<unknown>;
		const file = new File(["x"], "pic.png", { type: "image/png" });
		const result = await upload(fakeCtx({ client }), file);

		expect(captured?.path).toBe("/admin/posts/uploads/cover");
		expect(captured?.formData.get("file")).toBe(file);
		expect(result).toEqual({ data: { path: "u1", url: "/u/u1" } });
	});

	it("preserves passthrough options alongside the injected closure", () => {
		const out = materialize(node("upload", { accept: "image/*", maxSize: 100 }, "cover"), BASE);
		expect(opts(out).accept).toBe("image/*");
		expect(opts(out).maxSize).toBe(100);
		expect(typeof opts(out).upload).toBe("function");
	});
});
