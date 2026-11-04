import { describe, expect, test } from "bun:test";
import { PGlite } from "@electric-sql/pglite";
import { DummyDriver, Kysely, MysqlAdapter, MysqlIntrospector, MysqlQueryCompiler } from "kysely";
import { PGliteDialect } from "kysely-pglite-dialect";
import { kyselyDriver } from "../src/adapters/kysely";

interface DB {
	posts: { id: number; title: string; views: number };
}

async function postgres(): Promise<Kysely<DB>> {
	const pg = new PGlite();
	await pg.exec("create table posts (id serial primary key, title text, views int)");
	await pg.exec(
		"insert into posts (title, views) values ('alpha', 10), ('beta 100%', 30), ('gamma', 20)",
	);
	return new Kysely<DB>({ dialect: new PGliteDialect(pg) });
}

describe("kyselyDriver on Postgres", () => {
	test("count ignores the ORDER BY a sorted table carries", async () => {
		const db = await postgres();
		const driver = kyselyDriver(db);
		const sorted = driver.orderBy(db.selectFrom("posts").selectAll() as never, "views", "desc");
		expect(await driver.count(sorted)).toBe(3);
		const rows = await driver.rows(sorted, { page: 1, perPage: 2 });
		expect(rows.map((r) => r.title)).toEqual(["beta 100%", "gamma"]);
	});

	test("search escapes LIKE wildcards", async () => {
		const db = await postgres();
		const driver = kyselyDriver(db);
		const search = (text: string) =>
			driver.count(driver.searchAny(db.selectFrom("posts") as never, ["title"], text));
		expect(await search("a")).toBe(3);
		expect(await search("%")).toBe(1);
		expect(await search("_")).toBe(0);
	});
});

describe("kyselyDriver on MySQL", () => {
	test("the LIKE escape is not a backslash, which MySQL reads as a string escape", () => {
		const db = new Kysely<DB>({
			dialect: {
				createAdapter: () => new MysqlAdapter(),
				createDriver: () => new DummyDriver(),
				createIntrospector: (k) => new MysqlIntrospector(k),
				createQueryCompiler: () => new MysqlQueryCompiler(),
			},
		});
		const driver = kyselyDriver(db);
		const query = driver.searchAny(
			db.selectFrom("posts").selectAll() as never,
			["title"],
			"a_",
		);
		const sql = query.compile();
		expect(sql.sql).toContain("escape '!'");
		expect(sql.sql).not.toContain("\\\\");
		expect(sql.parameters).toEqual(["%a!_%"]);
	});
});
