import { dataGet, dataSet } from "../server/validation/data";
import { check, fail, looseEqual, show } from "./assert";
import { type Call, openModal, runAction } from "./calls";
import type { TestResponse } from "./client";
import type { ModalTester } from "./modalTester";
import * as records from "./records";
import type { Result } from "./result";
import { TableShape } from "./tableShape";
import type { Bag, PageVisit } from "./visit";
import * as wire from "./wire";

/**
 * One table on the page. search(), filter(), sort(), tab(), page() and
 * perPage() collect the query; `await fetch()` loads the rows the
 * assertions read. Changing the query after a fetch needs a new fetch.
 */
export class TableTester {
	private readonly query: Bag = {};
	private fetched: TestResponse | null = null;

	private readonly shape: TableShape;

	constructor(
		private readonly visit: PageVisit,
		private readonly name: string,
		private readonly node: wire.WireNode,
	) {
		this.shape = new TableShape(name, node);
	}

	/** Fetch the rows for the current query. */
	async fetch(): Promise<this> {
		this.fetched = await this.visit.http.fetch(
			this.visit.endpoint("table", this.name),
			this.query,
		);
		return this;
	}

	/** The last table fetch's raw response. */
	response(): TestResponse {
		return this.loaded();
	}

	/** The table endpoint refused the fetch: 403. */
	assertForbidden(): this {
		const { status } = this.loaded();
		check(status === 403, `Table [${this.name}] responded ${status}, expected 403.`);
		return this;
	}

	/** Table-wide search over the searchable columns. */
	search(text: string): this {
		this.shape.searchable();
		return this.with("search", text);
	}

	/** One column's own search box. */
	searchColumn(column: string, text: string): this {
		this.shape.column(column);
		return this.with(`colSearch.${column}`, text);
	}

	/** Set a declared filter's value. */
	filter(name: string, value: unknown): this {
		this.shape.filter(name);
		return this.with(`filters.${name}`, value);
	}

	/** Sort by a sortable column, or the default sort's field. */
	sort(column: string, direction: "asc" | "desc" = "asc"): this {
		this.shape.sortable(column);
		return this.with("sort", column).with("dir", direction);
	}

	/** Switch to a declared filter tab. */
	tab(name: string): this {
		this.shape.tab(name);
		return this.with("tab", name);
	}

	/** Go to a page of rows. */
	page(page: number): this {
		return this.with("page", page);
	}

	/** Pick a page size; the server clamps it to the declared options. */
	perPage(perPage: number): this {
		return this.with("perPage", perPage);
	}

	/** The column ships to the client. */
	assertColumnVisible(name: string): this {
		this.shape.column(name);
		return this;
	}

	/** The column is off the wire: hidden() or excluded. */
	assertColumnHidden(name: string): this {
		check(!this.shape.columnNames().includes(name), `Column [${name}] is visible.`);
		return this;
	}

	/** These records are on the current page of rows, in this order when asked. */
	assertCanSeeRecords(
		list: records.RecordRef | Iterable<records.RecordRef>,
		inOrder = false,
	): this {
		const want = records.keys(list).map(String);
		const seen = this.keys().map(String);
		const missing = want.filter((k) => !seen.includes(k));
		check(
			missing.length === 0,
			`Table [${this.name}] does not show these records: ${show(missing)}. Shown keys: ${show(seen)}`,
		);
		if (inOrder) {
			const order = seen.filter((k) => want.includes(k));
			check(
				looseEqual(order, want),
				`Table [${this.name}] shows the records in another order: ${show(seen)}`,
			);
		}
		return this;
	}

	/** None of these records is on the current page of rows. */
	assertCanNotSeeRecords(list: records.RecordRef | Iterable<records.RecordRef>): this {
		const seen = this.keys().map(String);
		const shown = records
			.keys(list)
			.map(String)
			.filter((k) => seen.includes(k));
		check(
			shown.length === 0,
			`Table [${this.name}] shows records it should not: ${show(shown)}`,
		);
		return this;
	}

	/** Rows on the current page. */
	assertCountRecords(count: number): this {
		const got = this.rows().length;
		check(got === count, `Table [${this.name}] shows ${got} rows, expected ${count}.`);
		return this;
	}

	/** The total across all pages; needs a length-aware table. */
	assertTotal(total: number): this {
		const data = this.data();
		check(
			"total" in data,
			`Table [${this.name}] uses simplePagination() and reports no total.`,
		);
		check(
			data.total === total,
			`Table [${this.name}] has a total of ${show(data.total)}, expected ${total}.`,
		);
		return this;
	}

	/** A count-bearing tab's count. */
	assertTabCount(tab: string, count: number): this {
		const got = (this.data().tabCounts as Bag | undefined)?.[tab];
		check(got === count, `Tab [${tab}] has a count of ${show(got)}, expected ${count}.`);
		return this;
	}

	/** One cell, as the server formatted it. */
	assertCell(record: records.RecordRef, column: string, value: unknown): this {
		this.shape.column(column.split(".")[0] ?? column);
		const got = dataGet(this.row(record), column);
		check(
			looseEqual(got, value),
			`Cell [${column}] of record [${records.key(record)}] is ${show(got)}, expected ${show(value)}.`,
		);
		return this;
	}

	/** Run a row action on a record of the current page. */
	async callRowAction(name: string, record: records.RecordRef, form: Bag = {}): Promise<Result> {
		return this.call(name, { form, row: await this.rowToSend(record), selection: [] });
	}

	/** Open a row action's modal for a record of the current page. */
	async openRowAction(name: string, record: records.RecordRef): Promise<ModalTester> {
		const call = { row: await this.rowToSend(record), selection: [] };
		return openModal(this.visit, this.visit.action(name, this.node).node, call);
	}

	/** Run a bulk action on these records. */
	callBulkAction(
		name: string,
		list: records.RecordRef | Iterable<records.RecordRef>,
		form: Bag = {},
	): Promise<Result> {
		return this.call(name, { form, row: {}, selection: records.keys(list) });
	}

	/** Run a table header action. */
	callAction(name: string, form: Bag = {}): Promise<Result> {
		return this.call(name, { form, row: {}, selection: [] });
	}

	/** The current page of rows, as the client receives them. */
	rows(): Bag[] {
		const rows = this.data().data;
		return Array.isArray(rows) ? (rows as Bag[]) : [];
	}

	/** Run an action of the table; the next assertion needs a new fetch. */
	private async call(name: string, call: Call): Promise<Result> {
		const result = await runAction(this.visit, this.visit.action(name, this.node), call);
		this.fetched = null;
		return result;
	}

	private with(key: string, value: unknown): this {
		dataSet(this.query, key, value);
		this.fetched = null;
		return this;
	}

	private loaded(): TestResponse {
		return (
			this.fetched ??
			fail(`Table [${this.name}] has no rows for its current query: await fetch() first.`)
		);
	}

	private data(): Bag {
		const response = this.loaded();
		check(
			response.status === 200,
			`Table [${this.name}] responded ${response.status}: ${response.text.slice(0, 500)}`,
		);
		return ((response.json as Bag | null)?.data ?? {}) as Bag;
	}

	private keys(): records.Key[] {
		return this.rows().map((r) => records.key(r));
	}

	private async rowToSend(record: records.RecordRef): Promise<Bag> {
		if (this.fetched === null) {
			await this.fetch();
		}
		return this.loaded().status === 200 ? this.row(record) : { _key: records.key(record) };
	}

	private row(record: records.RecordRef): Bag {
		const key = String(records.key(record));
		const found = this.rows().find((r) => String(records.key(r)) === key);
		return (
			found ??
			fail(
				`Record [${key}] is not on the current page of table [${this.name}]. Shown keys: ${show(this.keys())}`,
			)
		);
	}
}
