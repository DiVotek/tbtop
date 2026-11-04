import { describe, expect, test } from "bun:test";
import { createAdmin, definePage, EditAction, Effects, Embed, memoryDisk } from "../src";

let submitted: Record<string, unknown> = {};
const stored = { cover: "uploads/stored.png" };

const admin = createAdmin({
	allowGuests: true,
	prefix: "/admin",
	disks: { public: memoryDisk() },
	pages: [
		definePage({
			path: "article",
			title: "Article",
			view: (s) =>
				s.stack([
					s
						.form("article", [
							s
								.richtext("body")
								.embeds([
									Embed.make("callout")
										.label("Callout")
										.fields([s.text("title").required()]),
								])
								.maxEmbeds(2),
						])
						.onSubmit(({ form }) => {
							submitted = form;
						}),
					s.actionsRow([
						EditAction.make(s, {
							form: s.form("cover", [s.upload("cover")]),
							loadUsing: () => stored,
							saveUsing: (ctx) => Effects.make().notify(String(ctx.form.cover)),
						}),
					]),
				]),
		}),
	],
});

const embed = (id: string, data: Record<string, unknown>, extra: Record<string, unknown> = {}) => ({
	type: "embed",
	version: 1,
	id,
	kind: "callout",
	data,
	...extra,
});
const doc = (...children: unknown[]) => ({ root: { type: "root", children } });

async function post(path: string, body: unknown) {
	const res = await admin.handle(
		new Request(`http://x/admin/article/${path}`, {
			method: "POST",
			body: JSON.stringify(body),
			headers: { "content-type": "application/json", accept: "application/json" },
		}),
	);
	return {
		status: res?.status,
		body: (await res?.json().catch(() => null)) as Record<string, unknown>,
	};
}

const submit = (body: unknown) =>
	admin.handle(
		new Request("http://x/admin/article/forms/article", {
			method: "POST",
			body: JSON.stringify({ body }),
			headers: { "content-type": "application/json", "x-inertia": "true" },
		}),
	);

describe("richtext embeds", () => {
	test("embed data is validated per kind and narrowed to its declared keys", async () => {
		submitted = {};
		await submit(doc(embed("a", { title: "" })));
		expect(submitted).toEqual({});
		await submit(doc(embed("a", { title: "Hi", smuggled: "x" })));
		expect(submitted).toEqual({ body: doc(embed("a", { title: "Hi" })) });
	});

	test("malformed, nested, duplicate and too many embeds fail the field", async () => {
		for (const body of [
			doc(embed("a", { title: "x" }, { version: 2 })),
			doc({ type: "paragraph", children: [embed("a", { title: "x" })] }),
			doc(embed("a", { title: "x" }), embed("a", { title: "y" })),
			doc(embed("a", { title: "x" }), embed("b", { title: "y" }), embed("c", { title: "z" })),
		]) {
			submitted = {};
			await submit(body);
			expect(submitted).toEqual({});
		}
	});

	test("the modal's Apply validates against the embed's fields", async () => {
		const bad = await post("actions/__embed", {
			payload: { embed: { field: "body", kind: "callout" }, form: { title: "" } },
		});
		expect(bad.status).toBe(422);
		const ok = await post("actions/__embed", {
			payload: { embed: { field: "body", kind: "callout" }, form: { title: "Hi", x: 1 } },
		});
		expect(ok.body).toEqual({ effects: [], data: { title: "Hi" } });
		const unknown = await post("actions/__embed", {
			payload: { embed: { field: "body", kind: "nope" }, form: {} },
		});
		expect(unknown.status).toBe(404);
	});
});

describe("modal record", () => {
	test("an upload in an edit modal keeps the path its loaded record stores", async () => {
		const res = await post("actions/editSave", {
			payload: { row: { _key: 1 }, form: { cover: "uploads/stored.png" } },
		});
		expect(res.body).toMatchObject({ effects: [{ message: "uploads/stored.png" }] });
		const foreign = await post("actions/editSave", {
			payload: { row: { _key: 1 }, form: { cover: "uploads/other.png" } },
		});
		expect(foreign.status).toBe(422);
	});
});
