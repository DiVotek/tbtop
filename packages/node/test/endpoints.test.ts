import { beforeEach, describe, expect, test } from "bun:test";
import { db, driver, hostRules, pages } from "../example/posts";
import { createAdmin } from "../src";

const admin = createAdmin({ prefix: "/admin", pages, driver, hostRules });
const seed = structuredClone(db.posts);
beforeEach(() => {
	db.posts = structuredClone(seed);
});

const post = (url: string, body: unknown) =>
	admin.handle(
		new Request(`http://x${url}`, {
			method: "POST",
			body: JSON.stringify(body),
			headers: { "content-type": "application/json" },
		}),
	);

describe("endpoint cluster", () => {
	test("page props carry the record of every form", async () => {
		const props = await admin.pageProps(new Request("http://x/admin/posts/2/edit"));
		if (props instanceof Response) {
			throw new TypeError("expected page props");
		}
		expect(props.data.post).toMatchObject({ id: 2, slug: "second-post" });
		expect(props.params).toEqual({ post: "2" });
		expect(props.tbtop.nav).toEqual([
			{
				key: "Content",
				group: "Content",
				items: [
					{
						label: "Posts",
						href: "/admin/posts",
						order: 1,
						icon: { name: "file-text", position: "left" },
					},
				],
			},
		]);
	});

	test("row action resolves its closure by name from a fresh view()", async () => {
		const res = (await post("/admin/posts/actions/delete", { payload: { row: { _key: 1 } } }))!;
		expect((await res.json()).effects).toEqual([
			{ kind: "notify", message: "Post deleted", level: "success" },
			{ kind: "refreshTable", table: "posts" },
		]);
		expect(db.find(1)).toBeUndefined();
	});

	test("table data: whitelisted sort, search, pagination, projection with _key", async () => {
		const res = (await admin.handle(
			new Request(
				"http://x/admin/posts/tables/posts?sort=views&dir=desc&perPage=999&search=post",
			),
		))!;
		const { data } = await res.json();
		expect(data.perPage).toBe(10);
		expect(data.data).toEqual([
			{ _key: 2, id: "#2", title: "Second post", status: "draft", views: 4 },
		]);
		const bySlug = await (await admin.handle(
			new Request("http://x/admin/posts/tables/posts?sort=slug"),
		))!.json();
		expect(bySlug.data.data.map((r: { _key: number }) => r._key)).toEqual([3, 2, 1]); // slug not sortable → default id desc
	});

	test("non-admin URLs fall through to the host", async () => {
		expect(await admin.handle(new Request("http://x/blog/1"))).toBeNull();
		expect(await admin.handle(new Request("http://x/admin-other"))).toBeNull();
	});
});
