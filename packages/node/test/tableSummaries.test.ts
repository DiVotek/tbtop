import { describe, expect, test } from "bun:test";
import { Column, createAdmin, definePage, S, Summary } from "../src";
import { memoryDriver, memoryQuery } from "../src/adapters/memory";
import type { QueryDriver } from "../src/server/driver";

const orders = [
	{ id: 1, status: "paid", total: 1000, rating: 4, placed_on: "2026-01-05" },
	{ id: 2, status: "paid", total: 2550, rating: 5, placed_on: "2026-02-10" },
	{ id: 3, status: "new", total: 500, rating: null, placed_on: "2026-03-01" },
];

function adminWith(view: (s: S) => unknown, driver: QueryDriver = memoryDriver()) {
	const admin = createAdmin({
		allowGuests: true,
		prefix: "/admin",
		driver: driver as never,
		pages: [definePage({ path: "orders", title: "Orders", view: view as never })],
	});
	return async (query = "") => {
		const res = await admin.handle(new Request(`http://x/admin/orders/tables/orders?${query}`));
		if (res === null) {
			throw new TypeError("not an admin endpoint");
		}
		const body = await res.json();
		if (res.status !== 200) {
			throw new Error(JSON.stringify(body));
		}
		return body.data;
	};
}

const summaryTable = (s: S) =>
	s
		.table("orders")
		.columns([
			Column.make("status").searchable(),
			Column.make("total").money("UAH").summarize(Summary.sum("Total"), Summary.avg()),
			Column.make("rating").summarize(
				Summary.avg(),
				Summary.min(),
				Summary.max(),
				Summary.count(),
			),
			Column.make("placed_on").date("d.m.Y").summarize(Summary.min(), Summary.max()),
		])
		.defaultSort("status", "desc")
		.paginate(1, [1])
		.query(() => memoryQuery(() => orders));

describe("Column.summarize()", () => {
	test("serializes type, and label only when given", () => {
		const column = Column.make("total").summarize(
			Summary.sum("Total"),
			Summary.count(),
			Summary.using(() => "x", "Note"),
		);
		expect(column.toJSON().summaries).toEqual([
			{ type: "sum", label: "Total" },
			{ type: "count" },
			{ type: "custom", label: "Note" },
		]);
		expect(Column.make("total").toJSON()).not.toHaveProperty("summaries");
	});

	test("refuses a group column and a built-in on a relation path", () => {
		const group = Column.make("g")
			.group([Column.make("a")])
			.summarize(Summary.count());
		expect(() => group.toJSON()).toThrow("summarize() is not supported on a group column");
		expect(() => Column.make("author.age").summarize(Summary.sum())).toThrow(
			"use Summary::using()",
		);
	});

	test("summarizes every matching row, not just the page, formatted like the cells", async () => {
		const result = await adminWith(summaryTable)();
		expect(result.data).toHaveLength(1);
		expect(result.summaries).toEqual({
			total: ["40.50 UAH", "13.50 UAH"],
			rating: [4.5, 4, 5, 3],
			placed_on: ["05.01.2026", "01.03.2026"],
		});
	});

	test("follows the search, and an empty result sums to zero with null min/max/avg", async () => {
		const get = adminWith(summaryTable);
		expect((await get("search=paid")).summaries.total).toEqual(["35.50 UAH", "17.75 UAH"]);
		const empty = await get("search=refunded");
		expect(empty.summaries.total).toEqual(["0.00 UAH", null]);
		expect(empty.summaries.rating).toEqual([null, null, null, 0]);
	});

	test("a custom summary gets the filtered query and shows what it returns", async () => {
		const driver = memoryDriver();
		const get = adminWith(
			(s) =>
				s
					.table("orders")
					.columns([
						Column.make("status").summarize(
							Summary.using(
								async (q: ReturnType<typeof memoryQuery>) =>
									`${await driver.count(driver.where(q, { field: "status", op: "=", value: "paid" }))} paid`,
								"Status",
							),
						),
					])
					.defaultSort("status")
					.query(() => memoryQuery(() => orders)),
			driver,
		);
		expect((await get()).summaries).toEqual({ status: ["2 paid"] });
	});

	test("a table without summaries adds nothing", async () => {
		const get = adminWith((s) =>
			s
				.table("orders")
				.columns([Column.make("status")])
				.query(() => memoryQuery(() => orders)),
		);
		const result = await get();
		expect(result).not.toHaveProperty("summaries");
		expect(result.data[0]).not.toHaveProperty("_groupSummary");
	});

	test("puts each group summary on the first row of its run, over the whole group", async () => {
		const get = adminWith((s) =>
			s
				.table("orders")
				.columns([
					Column.make("status"),
					Column.make("total").money("UAH").summarize(Summary.sum()),
				])
				.defaultSort("status", "desc")
				.groups("status")
				.paginate(2, [2])
				.query(() => memoryQuery(() => orders)),
		);
		const [first, second] = (await get()).data;
		expect(first._groupSummary).toEqual({ total: ["35.50 UAH"] });
		expect(second).not.toHaveProperty("_groupSummary");
		expect((await get("page=2")).data[0]._groupSummary).toEqual({ total: ["5.00 UAH"] });
	});

	test("a null row group sums its own rows", async () => {
		const withNull = [
			...orders,
			{ id: 4, status: null, total: 300, rating: 1, placed_on: "2026-04-01" },
		];
		const get = adminWith((s) =>
			s
				.table("orders")
				.columns([
					Column.make("status"),
					Column.make("total").money("UAH").summarize(Summary.sum()),
				])
				.defaultSort("status", "asc")
				.groups("status")
				.query(() => memoryQuery(() => withNull)),
		);
		const nullRow = (await get()).data.find((r: { status: unknown }) => r.status === null);
		expect(nullRow._groupSummary).toEqual({ total: ["3.00 UAH"] });
	});

	test("keeps one subtotal per displayed group when the group column is formatted", async () => {
		const events = [
			{ id: 1, at: "2026-01-05 10:00:00", total: 1000 },
			{ id: 2, at: "2026-01-05 15:00:00", total: 2550 },
			{ id: 3, at: "2026-03-01 09:00:00", total: 500 },
		];
		const get = adminWith((s) =>
			s
				.table("orders")
				.columns([
					Column.make("at").date("d.m.Y"),
					Column.make("total").money("UAH").summarize(Summary.sum()),
				])
				.defaultSort("at", "asc")
				.groups("at")
				.query(() => memoryQuery(() => events)),
		);
		const [first, second, third] = (await get()).data;
		expect(first._groupSummary).toEqual({ total: ["35.50 UAH"] });
		expect(second).not.toHaveProperty("_groupSummary");
		expect(third._groupSummary).toEqual({ total: ["5.00 UAH"] });
	});

	test("keeps a text min/max as stored", async () => {
		const get = adminWith((s) =>
			s
				.table("orders")
				.columns([Column.make("code").summarize(Summary.min(), Summary.max())])
				.query(() =>
					memoryQuery(() => [
						{ id: 1, code: "007" },
						{ id: 2, code: "010" },
					]),
				),
		);
		expect((await get()).summaries).toEqual({ code: ["007", "010"] });
	});

	test("a built-in summary needs a driver with aggregate()", async () => {
		const { aggregate: _drop, ...bare } = memoryDriver();
		await expect(adminWith(summaryTable, bare)()).rejects.toThrow("aggregate()");
	});
});
