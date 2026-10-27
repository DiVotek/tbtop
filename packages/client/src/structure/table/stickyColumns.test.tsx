/**
 * Sticky columns: which cells pin, which slot each takes, and the measured
 * left offsets written onto the table.
 */
import { describe, expect, test } from "bun:test";
import { render } from "@testing-library/react";
import { wrapForStructure } from "../testFixtures";
import type { TableColumn } from "../types";
import { TableGrid } from "./grid";
import { resolveStickyLayout } from "./stickyColumns";

const Wrap = wrapForStructure(() => new Response("{}"));

const COLUMNS: TableColumn[] = [
	{ name: "id", label: "ID", sticky: true },
	{ name: "title", label: "Title", sticky: true, columnSearchable: true },
	{ name: "status", label: "Status" },
];
const ROWS = [{ id: "1", title: "a", status: "draft" }];

function renderGrid(columns: TableColumn[], hasBulk = true) {
	return render(
		<Wrap>
			<TableGrid
				rows={ROWS}
				columns={columns}
				rowActions={[]}
				selectedIds={[]}
				onToggle={() => {}}
				onSelectAll={() => {}}
				onClearSelection={() => {}}
				hasBulk={hasBulk}
				hasRowActions={false}
				onSort={() => {}}
				hasActiveFilters={false}
				onResetFilters={() => {}}
			/>
		</Wrap>,
	);
}

function pinnedSlots(row: Element): (string | null)[] {
	return [...row.children].map((cell) =>
		cell.classList.contains("tbtop-sticky-cell") ? cell.getAttribute("style") : null,
	);
}

describe("resolveStickyLayout", () => {
	test("only the leading run of sticky columns pins", () => {
		const layout = resolveStickyLayout(
			[{ name: "a", sticky: true }, { name: "b" }, { name: "c", sticky: true }],
			{ reorder: false, bulk: false },
		);
		expect(layout?.columns).toEqual(["a"]);
	});

	test("no leading sticky column means no layout, even with a checkbox column", () => {
		expect(
			resolveStickyLayout([{ name: "a" }, { name: "b", sticky: true }], {
				reorder: false,
				bulk: true,
			}),
		).toBeUndefined();
	});
});

describe("TableGrid sticky columns", () => {
	test("the checkbox and the sticky columns pin in slot order; the rest scroll", () => {
		const { container } = renderGrid(COLUMNS);
		const bodyRow = container.querySelector("tbody tr");
		if (!bodyRow) {
			throw new Error("no body row");
		}
		expect(pinnedSlots(bodyRow)).toEqual([
			"left: var(--tbtop-sticky-0, 0px);",
			"left: var(--tbtop-sticky-1, 0px);",
			"left: var(--tbtop-sticky-2, 0px);",
			null,
		]);
	});

	test("only the last pinned cell carries the edge marker, in head, search and body rows", () => {
		const { container } = renderGrid(COLUMNS);
		const edges = [...container.querySelectorAll("[data-sticky-edge]")];
		expect(edges.map((cell) => cell.closest("tr")?.children[2] === cell)).toEqual([
			true,
			true,
			true,
		]);
	});

	test("only head-row cells are measured", () => {
		const { container } = renderGrid(COLUMNS);
		const measured = [...container.querySelectorAll("[data-sticky-slot]")];
		expect(
			measured.every((cell) => cell.closest("tr") === container.querySelector("thead tr")),
		).toBe(true);
		expect(measured.map((cell) => cell.getAttribute("data-sticky-slot"))).toEqual([
			"0",
			"1",
			"2",
		]);
	});

	test("offsets are cumulative header widths, written as vars on the table", () => {
		const original = HTMLElement.prototype.getBoundingClientRect;
		HTMLElement.prototype.getBoundingClientRect = () => ({ width: 40 }) as DOMRect;
		try {
			const { container } = renderGrid(COLUMNS);
			const table = container.querySelector("table");
			expect(
				["0", "1", "2"].map((slot) =>
					table?.style.getPropertyValue(`--tbtop-sticky-${slot}`),
				),
			).toEqual(["0px", "40px", "80px"]);
		} finally {
			HTMLElement.prototype.getBoundingClientRect = original;
		}
	});

	test("a table without sticky columns pins nothing, checkbox included", () => {
		const { container } = renderGrid([{ name: "title" }, { name: "status" }]);
		expect(container.querySelector(".tbtop-sticky-cell")).toBeNull();
	});
});
