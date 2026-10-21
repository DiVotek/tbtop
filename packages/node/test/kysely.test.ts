import { Database } from "bun:sqlite";
import { describe, expect, test } from "bun:test";
import { Kysely } from "kysely";
import { BunSqliteDialect } from "kysely-bun-sqlite";
import { Column, createAdmin, definePage } from "../src";
import { kyselyDriver } from "../src/adapters/kysely";

interface DB {
	posts: { id: number; title: string; published: number; views: number; sort_order: number };
}

function seededDb(): Kysely<DB> {
	const sqlite = new Database(":memory:");
	sqlite.run(
		"create table posts (id integer primary key, title text, published int, views int, sort_order int)",
	);
	const insert = sqlite.prepare(
		"insert into posts (title, published, views, sort_order) values (?, ?, ?, 0)",
	);
	for (const [title, published, views] of [
		["Alpha", 1, 10],
		["Beta 100%", 1, 30],
		["Hidden", 0, 50],
		["Gamma", 1, 20],
		["Delta", 1, 40],
	] as const) {
		insert.run(title, published, views);
	}
	return new Kysely<DB>({ dialect: new BunSqliteDialect({ database: sqlite }) });
}

const db = seededDb();
const admin = createAdmin({
	prefix: "/admin",
	driver: kyselyDriver(db) as never,
	pages: [
		definePage({
			path: "posts",
			title: "Posts",
			view: (s) =>
				s
					.table("posts")
					.columns([
						Column.make("title").sortable().searchable(),
						Column.make("views").sortable(),
					])
					.paginate(2, [2, 10])
					.reorderable("sort_order")
					.query(() => db.selectFrom("posts").where("published", "=", 1)),
		}),
	],
});

async function rows(query: string) {
	const res = await admin.handle(new Request(`http://x/admin/posts/tables/posts?${query}`));
	if (res === null) {
		throw new TypeError("not an admin endpoint");
	}
	return (await res.json()).data;
}

describe("kyselyDriver", () => {
	test("scope, whitelisted sort, pagination and total", async () => {
		const data = await rows("sort=views&dir=desc&page=2");
		expect(data.total).toBe(4);
		expect(data.data).toEqual([
			{ id: 4, _key: 4, title: "Gamma", views: 20 },
			{ id: 1, _key: 1, title: "Alpha", views: 10 },
		]);
	});

	test("search escapes LIKE wildcards", async () => {
		expect((await rows("search=a")).total).toBe(4);
		expect((await rows("search=%25")).total).toBe(1);
		expect((await rows("search=_")).total).toBe(0);
	});

	test("an undeclared sort column never reaches SQL", async () => {
		const data = await rows("sort=published);drop table posts;--");
		expect(data.total).toBe(4);
	});

	test("reorder writes positions, and rejects ids outside the scope", async () => {
		const reorder = (ids: number[]) =>
			admin.handle(
				new Request("http://x/admin/posts/tables/posts/reorder", {
					method: "POST",
					body: JSON.stringify({ ids }),
				}),
			);
		expect((await reorder([3, 1]))?.status).toBe(422);
		expect((await reorder([5, 4, 2, 1]))?.status).toBe(200);
		const order = await db
			.selectFrom("posts")
			.select(["id", "sort_order"])
			.where("published", "=", 1)
			.orderBy("sort_order")
			.execute();
		expect(order.map((r) => r.id)).toEqual([5, 4, 2, 1]);
	});
});
