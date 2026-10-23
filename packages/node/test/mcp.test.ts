import { beforeEach, describe, expect, test } from "bun:test";
import { db, driver, hostRules, pages } from "../example/posts";
import { createAdmin, definePage, Effects } from "../src";

const seed = structuredClone(db.posts);
beforeEach(() => {
	db.posts = structuredClone(seed);
});

const reported: unknown[] = [];

const extra = [
	definePage({
		path: "secret",
		title: "Secret",
		authorize: () => false,
		view: (s) => s.stack([]),
	}),
	definePage({ path: "hidden", title: "Hidden", mcp: false, view: (s) => s.stack([]) }),
	definePage({ path: "login", title: "Sign in", public: true, view: (s) => s.stack([]) }),
	definePage({
		path: "fragile",
		title: "Fragile",
		authorize: () => {
			throw new Error("reads a route param");
		},
		view: (s) => s.stack([]),
	}),
	definePage({
		path: "broken",
		title: "Broken",
		view: () => {
			throw new Error("SQLSTATE[42S02]: no such table");
		},
	}),
	definePage({
		path: "tools",
		title: "Tools",
		view: (s) =>
			s.stack([
				s
					.action("purge")
					.handle(() => Effects.make().notify("purged"))
					.mcp(false),
				s.action("ping").handle(() => Effects.make().notify("pong")),
				s.action("copy").custom("copyLink"),
			]),
	}),
];

const admin = createAdmin({
	allowGuests: true,
	prefix: "/admin",
	pages: [...pages, ...extra],
	driver,
	hostRules,
	mcp: {
		authenticate: (request) =>
			request.headers.get("authorization") === "Bearer t0ken" ? { name: "agent" } : null,
		allowedOrigins: ["https://agent.example.com:443"],
		report: (error) => reported.push(error),
	},
});

let nextId = 1;

async function rpc(method: string, params: unknown = {}, headers: Record<string, string> = {}) {
	const res = await admin.handle(
		new Request("http://x/admin/mcp", {
			method: "POST",
			headers: {
				authorization: "Bearer t0ken",
				"content-type": "application/json",
				...headers,
			},
			body: JSON.stringify({ jsonrpc: "2.0", id: nextId++, method, params }),
		}),
	);
	if (res === null) {
		throw new TypeError("the MCP route fell through");
	}
	return res;
}

/** tools/call, parsed: the JSON the tool answered and whether it is an error. */
async function call(name: string, args: Record<string, unknown> = {}) {
	const body = (await (await rpc("tools/call", { name, arguments: args })).json()) as {
		result: { content: { text: string }[]; isError?: boolean };
	};
	return {
		data: JSON.parse(body.result.content[0]?.text ?? "null"),
		isError: body.result.isError === true,
	};
}

describe("MCP transport", () => {
	test("initialize and tools/list describe the server", async () => {
		const init = await (await rpc("initialize", { protocolVersion: "2025-03-26" })).json();
		expect(init.result).toMatchObject({
			protocolVersion: "2025-03-26",
			capabilities: { tools: { listChanged: false } },
			serverInfo: { name: "Tabletop Admin" },
		});
		const list = await (await rpc("tools/list")).json();
		const tools = list.result.tools as { name: string; annotations: Record<string, boolean> }[];
		expect(tools.map((tool) => [tool.name, tool.annotations])).toEqual([
			["search", { readOnlyHint: true }],
			["query", { readOnlyHint: true }],
			["execute", { readOnlyHint: false, destructiveHint: true }],
		]);
	});

	test("auth and Origin are the MCP route's own: the session gate does not apply", async () => {
		expect((await rpc("ping", {}, { authorization: "" })).status).toBe(401);
		expect((await rpc("ping", {}, { origin: "https://evil.example" })).status).toBe(403);
		expect((await rpc("ping", {}, { origin: "https://agent.example.com" })).status).toBe(200);
		const get = await admin.handle(new Request("http://x/admin/mcp"));
		expect(get?.status).toBe(405);
	});

	test("notifications get 202; unknown methods and tools are JSON-RPC errors", async () => {
		const note = await admin.handle(
			new Request("http://x/admin/mcp", {
				method: "POST",
				headers: { authorization: "Bearer t0ken" },
				body: JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }),
			}),
		);
		expect(note?.status).toBe(202);
		expect((await (await rpc("resources/list")).json()).error.code).toBe(-32601);
		expect((await (await rpc("tools/call", { name: "nope" })).json()).error.code).toBe(-32602);
	});

	test("a batch gets its answers in order; a client response alone gets 202", async () => {
		const post = (body: unknown) =>
			admin.handle(
				new Request("http://x/admin/mcp", {
					method: "POST",
					headers: { authorization: "Bearer t0ken" },
					body: JSON.stringify(body),
				}),
			);
		const batch = await post([
			{ jsonrpc: "2.0", id: 1, method: "ping" },
			{ jsonrpc: "2.0", method: "notifications/initialized" },
			{ jsonrpc: "2.0", id: 2, method: "nope" },
		]);
		const answers = (await batch?.json()) as { id: number; error?: { code: number } }[];
		expect(answers.map((answer) => answer.id)).toEqual([1, 2]);
		expect(answers[1]?.error?.code).toBe(-32601);
		expect((await post({ jsonrpc: "2.0", id: 9, result: {} }))?.status).toBe(202);
		const empty = (await (await post([]))?.json()) as { error?: { code: number } } | undefined;
		expect(empty?.error?.code).toBe(-32600);
	});

	test("a page at the MCP path fails at createAdmin()", () => {
		const clash = definePage({ path: "mcp", title: "x", view: (s) => s.stack([]) });
		expect(() =>
			createAdmin({ prefix: "/a", pages: [clash], mcp: { authenticate: () => 1 } }),
		).toThrow('Page "mcp" collides');
	});
});

describe("search", () => {
	test("lists what the user may open: gated, public and mcp(false) pages are absent", async () => {
		const { data } = await call("search");
		const listed = data.pages as Record<string, unknown>[];
		expect(listed.map((page) => page.page)).toEqual([
			"posts",
			"posts/new",
			"posts/$post/edit",
			"fragile",
			"broken",
			"tools",
		]);
		expect(listed[2]).toEqual({
			page: "posts/$post/edit",
			title: "Edit post",
			params: ["post"],
		});
		expect(listed[3]).toEqual({
			page: "fragile",
			error: "This page failed to build; see the application log.",
		});
		expect(listed[4]).toEqual({
			page: "broken",
			error: "This page failed to build; see the application log.",
		});
	});

	test("a table page lists its row actions, the table and what it accepts", async () => {
		const { data } = await call("search", { page: "posts" });
		expect(data.executables).toEqual([
			{ id: "posts:edit", kind: "action", label: "Edit", needs: ["row"], table: "posts" },
			{
				id: "posts:delete",
				kind: "action",
				label: "Delete",
				confirm: "Delete post?",
				needs: ["row"],
				table: "posts",
			},
		]);
		expect(data.tables[0]).toMatchObject({
			table: "posts",
			search: ["title"],
			filters: [
				{
					name: "status",
					kind: "in",
					value: "array of values, a row matches any of them",
					options: [
						{ value: "draft", label: "Draft" },
						{ value: "published", label: "Published" },
					],
				},
			],
			sortable: ["title", "views", "id"],
			pagination: { perPage: 10, options: [10, 25] },
		});
	});

	test("a record page describes its form with rules and current values", async () => {
		const { data } = await call("search", { page: "posts/$post/edit", params: { post: "2" } });
		const [form] = data.executables;
		expect(form).toMatchObject({ id: "posts/$post/edit:post", kind: "form", form: "post" });
		expect(form.fields[0]).toEqual({
			name: "title",
			kind: "text",
			label: "Title",
			rules: ["required", "max:200"],
		});
		expect(form.values).toMatchObject({ title: "Second post", slug: "second-post" });
		expect((await call("search", { page: "posts/$post/edit" })).data).toEqual({
			message: 'Page "posts/$post/edit" needs params: post.',
		});
	});

	test("client-only and mcp(false) actions are left out, with a reason for the first", async () => {
		const { data } = await call("search", { page: "tools" });
		expect(data.executables.map((e: { id: string }) => e.id)).toEqual(["tools:ping"]);
		expect(data.excluded).toEqual([
			{ id: "tools:copy", reason: "client-only custom action: it runs in the browser" },
		]);
	});
});

describe("query", () => {
	test("reads UI-shaped rows with the table's own sort and filters", async () => {
		const { data } = await call("query", {
			page: "posts",
			table: "posts",
			sort: "views",
			dir: "asc",
			filters: { status: ["published"] },
		});
		expect(data.data.map((row: { title: string }) => row.title)).toEqual([
			"Bun and TanStack",
			"Hello world",
		]);
		expect(data.data[0]).toMatchObject({ _key: 3, id: "#3" });
	});

	test("refuses what search() does not list", async () => {
		const refuse = async (args: Record<string, unknown>) =>
			(await call("query", { page: "posts", table: "posts", ...args })).data.message;
		expect(await refuse({ sort: "slug" })).toBe('Unknown sort "slug" for table "posts".');
		expect(await refuse({ perPage: 7 })).toBe("perPage 7 is not one of 10, 25.");
		expect(await refuse({ filters: { views: 1 } })).toBe(
			'Unknown filter "views" for table "posts".',
		);
		expect(await refuse({ dir: "up" })).toBe('dir must be "asc" or "desc".');
		expect(await refuse({ filter: "status" })).toBe(
			'Filter "status" has no dynamic options; search() lists its options.',
		);
	});
});

describe("execute", () => {
	test("a row action runs on the row from query(), and says where a redirect goes", async () => {
		const { data: rows } = await call("query", { page: "posts", table: "posts" });
		const row = rows.data.find((r: { _key: number }) => r._key === 2);
		const deleted = await call("execute", { id: "posts:delete", row });
		expect(deleted.data.effects[0]).toMatchObject({ kind: "notify" });
		expect(db.posts.map((p) => p.id)).toEqual([1, 3]);
		const edit = await call("execute", { id: "posts:edit", row: { _key: 1 } });
		expect(edit.data.effects).toEqual([
			{
				kind: "redirect",
				href: "/admin/posts/1/edit",
				page: "posts/$post/edit",
				params: { post: "1" },
			},
		]);
	});

	test("a call missing what the action needs is refused before it runs", async () => {
		const { data, isError } = await call("execute", { id: "posts:delete" });
		expect(isError).toBe(true);
		expect(data.message).toBe('"posts:delete" needs row. Pass a row from query().');
		expect(db.posts).toHaveLength(3);
	});

	test("a form validates first, then answers its effects", async () => {
		const invalid = await call("execute", { id: "posts/new:post", form: { title: "x" } });
		expect(invalid.data).toEqual({
			message: "Validation failed; nothing was run.",
			errors: {
				slug: ["The Slug field is required."],
				status: ["The Status field is required."],
			},
		});
		const created = await call("execute", {
			id: "posts/new:post",
			form: { title: "Agent post", slug: "agent-post", status: "draft" },
		});
		expect(created.data.ok).toBe(true);
		expect(created.data.effects[1]).toMatchObject({
			kind: "redirect",
			href: "/admin/posts/4/edit",
		});
		expect(db.posts.at(-1)?.title).toBe("Agent post");
	});

	test("gates, mcp(false) and unknown ids are refused; server failures stay generic", async () => {
		expect((await call("execute", { id: "secret:x" })).data.message).toBe(
			"Forbidden: This action is unauthorized.",
		);
		expect((await call("execute", { id: "tools:purge" })).data.message).toBe(
			'"tools:purge" is not executable here. Call search() for this page.',
		);
		expect((await call("execute", { id: "hidden:x" })).data.message).toBe(
			'Unknown page "hidden". Call search() to list pages.',
		);
		const before = reported.length;
		expect((await call("search", { page: "broken" })).data.message).toBe(
			"Server error; see the application log.",
		);
		expect(reported.length).toBe(before + 1);
	});
});
