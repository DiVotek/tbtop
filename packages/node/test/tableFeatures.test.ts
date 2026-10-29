import { describe, expect, test } from "bun:test";
import { Column, createAdmin, definePage, S } from "../src";
import { memoryDriver, memoryQuery } from "../src/adapters/memory";

const rows = Array.from({ length: 4 }, (_, i) => ({ id: i + 1, title: `Post ${i + 1}` }));
const driver = memoryDriver();
let counted = 0;
const countingDriver = {
	...driver,
	count: (query: Parameters<typeof driver.count>[0]) => {
		counted += 1;
		return driver.count(query);
	},
};

const admin = createAdmin({
	allowGuests: true,
	prefix: "/admin",
	driver: countingDriver as never,
	pages: [
		definePage({
			path: "posts",
			title: "Posts",
			view: (s) =>
				s
					.table("posts")
					.columns([Column.make("title")])
					.paginate(2, [2, 10])
					.simplePagination()
					.query(() => memoryQuery(() => rows)),
		}),
	],
});

async function page(query: string) {
	const res = await admin.handle(new Request(`http://x/admin/posts/tables/posts?${query}`));
	if (res === null) {
		throw new TypeError("not an admin endpoint");
	}
	return (await res.json()).data;
}

describe("simplePagination()", () => {
	test("answers hasMore instead of a total, with no count query", async () => {
		counted = 0;
		const first = await page("page=1");
		expect(first.hasMore).toBe(true);
		expect(first.total).toBeUndefined();
		expect(first.data.map((r: { id: number }) => r.id)).toEqual([1, 2]);
		const last = await page("page=2");
		expect(last.hasMore).toBe(false);
		expect(last.data.map((r: { id: number }) => r.id)).toEqual([3, 4]);
		expect(counted).toBe(0);
	});

	test("puts simple on the pagination wire", () => {
		const node = new S()
			.table("t")
			.columns([Column.make("a")])
			.simplePagination()
			.toJSON();
		expect((node as { options: { pagination: unknown } }).options.pagination).toEqual({
			perPage: 25,
			options: [10, 25, 50, 100],
			simple: true,
		});
	});
});

describe("poll()", () => {
	test("refuses an interval under five seconds", () => {
		expect(() => new S().table("t").poll(4)).toThrow("at least 5 seconds");
		expect(new S().table("t").poll(5).optionValue("poll")).toBe(5);
	});
});

describe("groups()", () => {
	const grouped = (opts?: { collapsible?: boolean; collapsed?: boolean }) =>
		new S().table("t").defaultSort("views", "desc").groups("views", opts).optionValue("groups");

	test("stays a plain label without flags", () => {
		expect(grouped()).toEqual({ column: "views" });
	});

	test("collapsible serializes collapsible: true", () => {
		expect(grouped({ collapsible: true })).toEqual({ column: "views", collapsible: true });
	});

	test("collapsed implies collapsible", () => {
		expect(grouped({ collapsed: true })).toEqual({
			column: "views",
			collapsible: true,
			collapsed: true,
		});
	});
});

describe("filtersIn('aside')", () => {
	const s = new S();
	const aside = () => s.table("t").filters([s.text("q")]).filtersIn("aside");

	test("carries filtersCollapsed when set", () => {
		const opts = aside().filtersCollapsed().toNode().options as Record<string, unknown>;
		expect(opts.filtersIn).toBe("aside");
		expect(opts.filtersCollapsed).toBe(true);
	});

	test("leaves filtersCollapsed out unless declared", () => {
		expect(aside().toNode().options).not.toHaveProperty("filtersCollapsed");
	});
});

describe("sticky()", () => {
	test("sticky columns must lead the list", () => {
		expect(() =>
			new S().table("t").columns([Column.make("a"), Column.make("b").sticky()]),
		).toThrow('Column "b": sticky columns must come first');
	});

	test("goes on a group, not on its children", () => {
		expect(() =>
			new S()
				.table("t")
				.columns([Column.make("g").group([Column.make("a").sticky(), Column.make("b")])]),
		).toThrow('sticky() goes on the group "g"');
	});
});

describe("group children (#391)", () => {
	const people = [
		{ id: 1, name: { en: "Zed", uk: "Зед" }, email: "b@x" },
		{ id: 2, name: { en: "Amy", uk: "Емі" }, email: "a@x" },
	];
	const groupAdmin = createAdmin({
		allowGuests: true,
		prefix: "/admin",
		driver: driver as never,
		pages: [
			definePage({
				path: "people",
				title: "People",
				view: (s) =>
					s
						.table("people")
						.columns([
							Column.make("who").group([
								Column.make("email").sortable(),
								Column.make("name").translatable(),
							]),
						])
						.query(() => memoryQuery(() => people)),
			}),
		],
	});

	test("a child sorts and reads its locale map", async () => {
		const res = await groupAdmin.handle(
			new Request("http://x/admin/people/tables/people?sort=email&dir=asc"),
		);
		if (res === null) {
			throw new TypeError("not an admin endpoint");
		}
		const data = (await res.json()).data.data;
		expect(data.map((r: { id: number }) => r.id)).toEqual([2, 1]);
		expect(data[0].name).toBe("Amy");
	});
});
