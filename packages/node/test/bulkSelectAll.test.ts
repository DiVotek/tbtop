import { Database } from "bun:sqlite";
import { beforeEach, describe, expect, test } from "bun:test";
import { Kysely, type SelectQueryBuilder } from "kysely";
import { BunSqliteDialect } from "kysely-bun-sqlite";
import { ActionCtx, Column, createAdmin, DeleteAction, definePage, Effects, Tab } from "../src";
import { kyselyDriver } from "../src/adapters/kysely";
import { testAdmin } from "../src/testing";

interface DB {
	posts: { id: number; title: string; published: number; status: string; note: string };
}

const sqlite = new Database(":memory:");
sqlite.run(
	"create table posts (id integer primary key, title text, published int, status text, note text)",
);
const db = new Kysely<DB>({ dialect: new BunSqliteDialect({ database: sqlite }) });

beforeEach(() => {
	sqlite.run("delete from posts");
	const insert = sqlite.prepare(
		"insert into posts (id, title, published, status, note) values (?, ?, ?, ?, '')",
	);
	insert.run(1, "Alpha one", 1, "live");
	insert.run(2, "Alpha two", 0, "draft");
	insert.run(3, "Bravo", 1, "live");
	insert.run(4, "Alpha three", 1, "draft");
});

type PostsQuery = SelectQueryBuilder<DB, "posts", object>;

/** Writes how the action saw its selection onto every record it reached. */
async function mark(ctx: ActionCtx) {
	const ids = await ctx.records<PostsQuery>().select("id").execute();
	const note = `${ctx.allMatching ? "all" : "some"}:${ctx.selection.length}`;
	await db
		.updateTable("posts")
		.set({ note })
		.where(
			"id",
			"in",
			ids.map((r) => r.id),
		)
		.execute();
	return Effects.make();
}

const bulkPage = definePage({
	path: "bulk-posts",
	title: "Bulk",
	view: (s) =>
		s.stack([
			s
				.table("posts")
				.columns([Column.make("title").label("Title").searchable()])
				.filters([s.boolean("published")])
				.tabs([
					Tab.make("all"),
					Tab.make("live").query((q) => (q as PostsQuery).where("status", "=", "live")),
				])
				.headerActions([s.action("headerMark").handle(mark, ["selection"])])
				.bulkActions([
					s.action("mark").handle(mark, ["selection"]),
					s.dropdown("More", [
						s
							.action("modalMark")
							.modal(
								"Mark",
								s.stack([s.action("modalMarkSave").handle(mark, ["selection"])]),
							),
					]) as never,
					DeleteAction.make(
						s,
						async (ctx) => {
							await db
								.deleteFrom("posts")
								.where("id", "in", ctx.selection.map(Number))
								.execute();
						},
						{ name: "deleteSelected", bulk: true },
					),
				])
				.query(() => db.selectFrom("posts")),
			s
				.table("drafts")
				.columns([Column.make("title").label("Title")])
				.bulkActions([s.action("markDrafts").handle(mark, ["selection"])])
				.query(() => db.selectFrom("posts").where("published", "=", 0)),
		]),
});

const admin = createAdmin({
	allowGuests: true,
	prefix: "/admin",
	driver: kyselyDriver(db) as never,
	pages: [bulkPage],
});

async function run(action: string, selection: unknown[], bulk: Record<string, unknown>) {
	const res = await admin.handle(
		new Request(`http://x/admin/bulk-posts/actions/${action}`, {
			method: "POST",
			body: JSON.stringify({ payload: { selection, bulk } }),
			headers: { "content-type": "application/json", accept: "application/json" },
		}),
	);
	return res?.status;
}

function notes(): Record<string, string> {
	const rows = sqlite.query("select title, note from posts order by id").all() as {
		title: string;
		note: string;
	}[];
	return Object.fromEntries(rows.map((r) => [r.title, r.note]));
}

describe("bulk select all matching (BulkSelectAllHttpTest.php)", () => {
	test("all matching replays the search: records() and selection hold every matching row", async () => {
		const query = "search=alpha&page=2&perPage=1";
		expect(await run("mark", [1], { table: "posts", all: true, query })).toBe(200);
		expect(notes()).toEqual({
			"Alpha one": "all:3",
			"Alpha two": "all:3",
			Bravo: "",
			"Alpha three": "all:3",
		});
	});

	test("all matching applies filters and the tab, trimmed like the table request", async () => {
		const query = "tab=live&search=%20alpha%20&filters%5Bpublished%5D=1";
		expect(await run("mark", [], { table: "posts", all: true, query })).toBe(200);
		expect(notes()).toEqual({
			"Alpha one": "all:1",
			"Alpha two": "",
			Bravo: "",
			"Alpha three": "",
		});
	});

	test("all matching stays inside the table query", async () => {
		expect(await run("markDrafts", [], { table: "drafts", all: true, query: "" })).toBe(200);
		expect(notes()).toEqual({
			"Alpha one": "",
			"Alpha two": "all:1",
			Bravo: "",
			"Alpha three": "",
		});
	});

	test("without all, records() is the checked keys inside the table query", async () => {
		expect(await run("markDrafts", [1, 2], { table: "drafts", all: false })).toBe(200);
		expect(notes()).toEqual({
			"Alpha one": "",
			"Alpha two": "some:2",
			Bravo: "",
			"Alpha three": "",
		});
	});

	test("a submit inside a bulk action modal in a dropdown counts as a bulk action", async () => {
		const bulk = { table: "posts", all: true, query: "search=bravo" };
		expect(await run("modalMarkSave", [], bulk)).toBe(200);
		expect(notes().Bravo).toBe("all:1");
	});

	test("a handler over ctx.selection acts on every matching row", async () => {
		const bulk = { table: "posts", all: true, query: "filters[published]=1" };
		expect(await run("deleteSelected", [], bulk)).toBe(200);
		expect(Object.keys(notes())).toEqual(["Alpha two"]);
	});

	test.each([
		["another table", "markDrafts", "posts"],
		["a header action", "headerMark", "posts"],
		["unknown table", "mark", "nope"],
	])("all matching is refused for %s", async (_label, action, table) => {
		expect(await run(action, [], { table, all: true, query: "" })).toBe(422);
		expect(new Set(Object.values(notes()))).toEqual(new Set([""]));
	});

	test("records() outside a table's bulk actions throws", async () => {
		await expect(run("headerMark", [1], { table: "posts", all: false })).rejects.toThrow(
			"only available to a table's bulk actions",
		);
	});

	test("the testing API names the table, so records() works in a callAction() or a bulk modal", async () => {
		const t = testAdmin(admin);
		(await (await t.page(bulkPage)).callAction("markDrafts", { selection: [1, 2] })).assertOk();
		const modal = await (await t.page(bulkPage)).openAction("modalMark", { selection: [3] });
		(await modal.callAction("modalMarkSave")).assertOk();
		expect(notes()).toEqual({
			"Alpha one": "",
			"Alpha two": "some:2",
			Bravo: "some:1",
			"Alpha three": "",
		});
	});
});
