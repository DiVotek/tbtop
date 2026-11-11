/**
 * Column summaries in TableGrid: the footer row under the body, and a
 * subtotal row closing each row group (kept under a collapsed header).
 */
import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, render, within } from "@testing-library/react";
import type { TableGroupsConfig } from "../tableBlock.types";
import { wrapForStructure } from "../testFixtures";
import type { TableColumn } from "../types";
import { TableGrid } from "./grid";
import type { SummaryValues } from "./normalize";

const Wrap = wrapForStructure(() => new Response("{}"));

afterEach(cleanup);

const COLUMNS: TableColumn[] = [
	{ name: "status", label: "Status" },
	{
		name: "total",
		label: "Total",
		summaries: [{ type: "sum", label: "Grand total" }, { type: "avg" }],
	},
];

const ROWS = [
	{
		_key: 1,
		status: "paid",
		total: "10.00 UAH",
		_groupSummary: { total: ["35.50 UAH", "17.75 UAH"] },
	},
	{ _key: 2, status: "paid", total: "25.50 UAH" },
	{
		_key: 3,
		status: "new",
		total: "5.00 UAH",
		_groupSummary: { total: ["5.00 UAH", "5.00 UAH"] },
	},
];

interface Over {
	columns?: TableColumn[];
	rows?: Record<string, unknown>[];
	summaries?: SummaryValues;
	groups?: TableGroupsConfig;
	hasBulk?: boolean;
}

function renderGrid(over: Over = {}) {
	return render(
		<Wrap>
			<TableGrid
				rows={over.rows ?? ROWS}
				columns={over.columns ?? COLUMNS}
				rowActions={[]}
				selectedIds={[]}
				onToggle={() => {}}
				onSelectAll={() => {}}
				onClearSelection={() => {}}
				hasBulk={over.hasBulk ?? false}
				hasRowActions={false}
				onSort={() => {}}
				hasActiveFilters={false}
				onResetFilters={() => {}}
				groups={over.groups}
				summaries={over.summaries}
			/>
		</Wrap>,
	);
}

describe("table footer summaries", () => {
	test("lays each summary out under its column, with the declared or default label", () => {
		const { getByTestId } = renderGrid({
			summaries: { total: ["40.50 UAH", "13.50 UAH"] },
			hasBulk: true,
		});
		const row = getByTestId("table-summary");
		const cells = row.querySelectorAll("td");
		// bulk checkbox slot, status, total
		expect(cells).toHaveLength(3);
		expect(cells[1]?.textContent).toBe("");
		expect(cells[2]?.textContent).toContain("Grand total 40.50 UAH");
		expect(cells[2]?.textContent).toContain("Average 13.50 UAH");
		expect(row.closest("tfoot")).toBeTruthy();
	});

	test("shows an em dash for a null value", () => {
		const { getByTestId } = renderGrid({ summaries: { total: [null, null] } });
		expect(within(getByTestId("table-summary")).getAllByText("—")).toHaveLength(2);
	});

	test("renders no footer without summary values, without declared summaries, or with no rows", () => {
		expect(renderGrid().queryByTestId("table-summary")).toBeNull();
		cleanup();
		const plain = COLUMNS.map(({ summaries: _s, ...col }) => col);
		expect(
			renderGrid({ columns: plain, summaries: { total: [1] } }).queryByTestId(
				"table-summary",
			),
		).toBeNull();
		cleanup();
		expect(
			renderGrid({ rows: [], summaries: { total: [1, 2] } }).queryByTestId("table-summary"),
		).toBeNull();
	});

	test("a child of a group column shows its summaries in the group's cell", () => {
		const columns: TableColumn[] = [
			{
				name: "money",
				kind: "group",
				label: "Money",
				columns: [{ name: "total", summaries: [{ type: "count" }] }],
			},
		];
		const { getByTestId } = renderGrid({
			columns,
			rows: [{ _key: 1, total: 1 }],
			summaries: { total: [3] },
		});
		expect(getByTestId("table-summary").textContent).toBe("Count 3");
	});
});

describe("row group summaries", () => {
	test("closes each group with its subtotal row", () => {
		const { container } = renderGrid({ groups: { column: "status" } });
		const order = Array.from(container.querySelectorAll("tbody tr")).map((tr) =>
			tr.getAttribute("data-testid")?.startsWith("table-group-summary")
				? "sum"
				: tr.textContent,
		);
		expect(order).toEqual([
			"paid",
			"paid10.00 UAH",
			"paid25.50 UAH",
			"sum",
			"new",
			"new5.00 UAH",
			"sum",
		]);
		expect(
			container.querySelector("[data-testid='table-group-summary']")?.textContent,
		).toContain("Grand total 35.50 UAH");
	});

	test("a collapsed group keeps its subtotal under the header", () => {
		const { container, getAllByTestId } = renderGrid({
			groups: { column: "status", collapsed: true },
		});
		expect(container.querySelectorAll("tbody tr")).toHaveLength(4);
		expect(getAllByTestId("table-group-summary")).toHaveLength(2);
		fireEvent.click(getAllByTestId("table-group-toggle")[0] as HTMLElement);
		expect(container.querySelectorAll("tbody tr")).toHaveLength(6);
	});

	test("a group without _groupSummary renders no subtotal row", () => {
		const rows = ROWS.map(({ _groupSummary: _g, ...row }) => row);
		expect(
			renderGrid({ rows, groups: { column: "status" } }).queryByTestId("table-group-summary"),
		).toBeNull();
	});
});
