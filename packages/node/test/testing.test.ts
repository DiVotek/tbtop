import { beforeEach, describe, expect, test } from "bun:test";
import {
	Column,
	createAdmin,
	currentContext,
	defineAbility,
	definePage,
	Effects,
	HttpError,
	type Row,
	Tab,
} from "../src";
import { type MemoryQuery, memoryDriver, memoryQuery } from "../src/adapters/memory";
import { TbtopAssertionError, testAdmin } from "../src/testing";

type Post = { id: number; title: string; published: boolean };
type User = { id: number; role: "editor" | "viewer" | "admin" };

const seed: Post[] = [
	{ id: 1, title: "Alpha", published: true },
	{ id: 2, title: "Beta", published: false },
	{ id: 3, title: "Gamma", published: true },
];
let posts: Post[] = [];
let submitted: Record<string, unknown> | null = null;
beforeEach(() => {
	posts = structuredClone(seed);
	submitted = null;
});

const role = () => (currentContext().user as User | null)?.role;
defineAbility("archive-posts", (user) => (user as User | null)?.role === "admin");

/** One page for each thing the testing API reads: field states, a form, a table, gated actions. */
const testingPage = definePage({
	path: "testing/$post",
	title: "Testing API",
	authorize: () => role() !== "viewer",
	view: (s, { params }) => {
		const post = posts.find((p) => p.id === Number(params.post));
		if (post === undefined) {
			throw new HttpError(404, "Not found.");
		}
		return s.stack([
			s
				.form("post", [
					s.text("title").label("Title").required().rules("max:20"),
					s.text("slug").disabled(),
					s.text("internal_notes").when(false),
					s.boolean("published").label("Published"),
					s
						.action("quickSave")
						.label("Quick save")
						.handle(
							(ctx) => Effects.make().notify(`Quick ${String(ctx.form.title)}`),
							["form"],
						),
				])
				.record({ title: post.title, slug: `post-${post.id}`, published: post.published })
				.onSubmit(({ form }) => {
					submitted = form;
					return form.title === "leave"
						? "/admin/elsewhere"
						: Effects.make().notify("Saved").resetForm("post");
				}),
			s
				.action("archive")
				.label("Archive")
				.authorize("archive-posts")
				.handle(() => Effects.make().notify("Archived"), ["row"]),
			s
				.table<MemoryQuery>("posts")
				.columns([
					Column.make("title").sortable(),
					Column.make("published").label("Published"),
				])
				.searchable(["title"])
				.filters([
					s.inFilter("published").options([
						{ value: "1", label: "Yes" },
						{ value: "0", label: "No" },
					]),
				])
				.tabs([
					Tab.make<MemoryQuery>("all"),
					Tab.make<MemoryQuery>("live")
						.query((q) => ({
							...q,
							filters: [...q.filters, (r) => r.published === "1"],
						}))
						.count(),
				])
				.defaultSort("title", "asc")
				.paginate(2, [2, 10])
				.rowActions([
					s.action("rename").handle(
						(ctx) => {
							const found = posts.find((p) => p.id === ctx.key());
							if (found) {
								found.title = `${String(ctx.row.title)}!`;
							}
							return Effects.make().refreshTable("posts");
						},
						["row"],
					),
					s
						.action("edit")
						.modal(
							"Edit post",
							s.form("editPost", [
								s.text("title").label("Title").required(),
								s.actionsRow([
									s.action("editSave").handle(
										(ctx) => {
											const found = posts.find((p) => p.id === ctx.key());
											if (found) {
												found.title = String(ctx.form.title);
											}
											return Effects.make().closeModal();
										},
										["form", "row"],
									),
								]),
							]),
						)
						.query((ctx) => posts.find((p) => p.id === ctx.key()) ?? {}),
				])
				.bulkActions([
					s.action("publish").handle(
						(ctx) => {
							for (const p of posts.filter((p) => ctx.selection.includes(p.id))) {
								p.published = true;
							}
							return Effects.make().notify(`${ctx.selection.length} published`);
						},
						["selection"],
					),
				])
				.query(() =>
					memoryQuery(
						() =>
							posts.map((p) => ({
								...p,
								published: p.published ? "1" : "0",
							})) as unknown as Row[],
					),
				),
		]);
	},
});

const admin = createAdmin({ prefix: "/admin", pages: [testingPage], driver: memoryDriver() });
const editor: User = { id: 1, role: "editor" };
const t = testAdmin(admin, { as: editor });
const page = () => t.page(testingPage, { post: 1 });

describe("testing API: the page", () => {
	test("reads field and action state from the wire", async () => {
		(await page())
			.assertOk()
			.assertTitle("Testing API")
			.assertFieldVisible("title")
			.assertFieldDisabled("slug")
			.assertFieldEnabled("title")
			.assertFieldHidden("internal_notes")
			.assertFieldValue("title", "Alpha")
			.assertActionHidden("archive");
		(
			await t.page(testingPage, { post: 1 }, { as: { id: 2, role: "admin" } })
		).assertActionVisible("archive");
	});

	test("answers 403 from the page gate, and still sends calls so the endpoints are checked too", async () => {
		const viewer = await t.page(testingPage, { post: 1 }, { as: { id: 3, role: "viewer" } });
		viewer.assertForbidden();
		(await viewer.form("post").submit()).assertForbidden();
		(await viewer.table("posts").fetch()).assertForbidden();
		(await viewer.callAction("quickSave")).assertForbidden();
	});

	test("a guest is a guest: no implicit login", async () => {
		(await testAdmin(admin).page(testingPage, { post: 1 })).assertStatus(401);
	});

	test("names what is on the page when a name is wrong", async () => {
		const tester = await page();
		expect(() => tester.assertFieldVisible("nope")).toThrow(
			"Field [nope] is not on page [testing/$post]",
		);
		expect(() => tester.form().fill({ nope: 1 })).toThrow(TbtopAssertionError);
		expect(() => tester.table("missing")).toThrow("On the page: tables posts.");
	});

	test("builds endpoint URLs", async () => {
		const tester = await page();
		expect(tester.url()).toBe("/admin/testing/1");
		expect(tester.url("action", "archive")).toBe("/admin/testing/1/actions/archive");
	});
});

describe("testing API: forms", () => {
	test("submits the prefilled record with the filled values and reads the flashed effects", async () => {
		(await (await page()).fill({ title: "Renamed" }).submit())
			.assertHasNoErrors()
			.assertNotified("Saved")
			.assertEffect("resetForm", { form: "post" })
			.assertOk();
		expect(submitted).toMatchObject({ title: "Renamed", published: true });
	});

	test("reads session validation errors, by field, rule or message", async () => {
		const tooLong = await (await page())
			.form("post")
			.fill({ title: "x".repeat(21) })
			.submit();
		tooLong
			.assertHasErrors("title")
			.assertHasErrors(["title"])
			.assertHasErrors({ title: "max:20" })
			.assertHasErrors({ title: "The Title field must not be greater than 20 characters." })
			.assertNoEffects();
		const empty = await (await page()).fill({ title: "" }).submit();
		empty.assertHasErrors({ title: "required" });
		expect(() => empty.assertHasErrors({ title: "max:20" })).toThrow(TbtopAssertionError);
		expect(submitted).toBeNull();
	});

	test("tells a redirect away from the way back", async () => {
		(await (await page()).fill({ title: "leave" }).submit()).assertRedirect("/admin/elsewhere");
		const stay = await (await page()).fill({ title: "stay" }).submit();
		expect(() => stay.assertRedirect()).toThrow("redirected nowhere");
	});

	test("runs a form action with the filled values", async () => {
		(
			await (await page()).form().fill({ title: "Quick" }).callAction("quickSave")
		).assertNotified("Quick Quick");
	});
});

describe("testing API: tables", () => {
	test("pages, sorts, searches, filters and switches tabs through the table endpoint", async () => {
		const table = (await page()).table();
		(await table.fetch())
			.assertCanSeeRecords([1, 2], true)
			.assertCanNotSeeRecords(3)
			.assertCountRecords(2)
			.assertTotal(3)
			.assertCell(2, "title", "Beta")
			.assertColumnVisible("title")
			.assertColumnHidden("slug");
		(await table.page(2).fetch()).assertCanSeeRecords(3);
		(await table.page(1).sort("title", "desc").fetch()).assertCanSeeRecords([3, 2], true);
		(await table.search("amm").fetch()).assertCanSeeRecords(3).assertCountRecords(1);
		const filtered = (await page()).table().filter("published", "0");
		(await filtered.fetch()).assertCanSeeRecords(2).assertCountRecords(1);
		(await (await page()).table().tab("live").fetch())
			.assertTabCount("live", 2)
			.assertCanNotSeeRecords(2);
	});

	test("refuses table state the table does not declare, and a stale query", async () => {
		const table = (await page()).table();
		expect(() => table.filter("nope", 1)).toThrow("has no filter [nope]");
		expect(() => table.tab("nope")).toThrow("has no tab [nope]");
		expect(() => table.sort("published")).toThrow("is not sortable");
		expect(() => table.search("x").assertCountRecords(1)).toThrow("await fetch() first");
	});

	test("sends a row action the row as the table shows it", async () => {
		const table = (await page()).table();
		(await table.callRowAction("rename", { id: 1 })).assertTableRefreshed("posts");
		expect(posts[0]?.title).toBe("Alpha!");
		await expect(table.callRowAction("rename", 3)).rejects.toThrow(
			"is not on the current page",
		);
	});

	test("opens a row modal with its query() data and submits through its one form action", async () => {
		const modal = await (await page()).table().openRowAction("edit", 2);
		modal.assertFormData({ title: "Beta" });
		(await modal.fill({ title: "Bee" }).submit()).assertHasNoErrors().assertModalClosed();
		expect(posts[1]?.title).toBe("Bee");
		const invalid = await (await page()).table().callRowAction("edit", 2, { title: "" });
		invalid.assertStatus(422).assertHasErrors({ title: "required" });
	});

	test("calls a bulk action with the selection", async () => {
		(await (await page()).table().callBulkAction("publish", [{ id: 2 }, 3])).assertNotified(
			"2 published",
		);
		expect(posts.every((p) => p.published)).toBe(true);
	});
});
