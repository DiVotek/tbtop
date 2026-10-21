import { Database } from "bun:sqlite";
import { describe, expect, test } from "bun:test";
import { Kysely } from "kysely";
import { BunSqliteDialect } from "kysely-bun-sqlite";
import { createAdmin, definePage } from "../src";
import { kyselyRows } from "../src/adapters/kysely";

interface DB {
	posts: { id: number; title: string; published: number; views: number };
}

function seededDb(): Kysely<DB> {
	const sqlite = new Database(":memory:");
	sqlite.run("create table posts (id integer primary key, title text, published int, views int)");
	const insert = sqlite.prepare("insert into posts (title, published, views) values (?, ?, ?)");
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
	pages: [
		definePage({
			path: "posts",
			title: "Posts",
			view: (s) =>
				s
					.table("posts")
					.columns([
						s.column("title").sortable().searchable(),
						s.column("views").sortable(),
					])
					.paginate(2, [2, 10])
					.rows(
						kyselyRows(db, "posts", { scope: (qb) => qb.where("published", "=", 1) }),
					),
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

describe("kyselyRows", () => {
	test("scope, whitelisted sort, pagination and total", async () => {
		const data = await rows("sort=views&dir=desc&page=2");
		expect(data.total).toBe(4);
		expect(data.data).toEqual([
			{ _key: 4, title: "Gamma", views: 20 },
			{ _key: 1, title: "Alpha", views: 10 },
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
});
