/**
 * TableGrid reorder render rules (static — no pointer drag):
 * - reorder enabled: leading handle column + per-row drag handles, no hint
 * - reorder disabled: no drag handles, disabled hint shown
 * - colSpan accounts for the handle column only when reorder is active
 */
import { describe, expect, test } from "bun:test";
import { fireEvent, render } from "@testing-library/react";
import type { TableEmptyState, TableGroupsConfig } from "../tableBlock.types";
import { wrapForStructure } from "../testFixtures";
import type { TableColumn } from "../types";
import { TableGrid } from "./grid";

// Real provider chain (not a global module mock) so rows resolve the action
// context without leaking a stub into other files — mock.module is process-wide.
const Wrap = wrapForStructure(() => new Response("{}"));

const COLUMNS: TableColumn[] = [{ name: "title", label: "Title" }];
const GROUPABLE_COLUMNS: TableColumn[] = [...COLUMNS, { name: "status", label: "Status" }];
const ROWS = [
	{ id: "1", title: "a" },
	{ id: "2", title: "b" },
];

interface Overrides {
	reorderColumn?: string;
	reorderEnabled?: boolean;
	rows?: Record<string, unknown>[];
	emptyState?: TableEmptyState;
	recordUrl?: boolean;
	groups?: TableGroupsConfig;
	columns?: TableColumn[];
}

function gridElement(over: Overrides = {}) {
	return (
		<Wrap>
			<TableGrid
				rows={over.rows ?? ROWS}
				columns={over.columns ?? COLUMNS}
				rowActions={[]}
				selectedIds={[]}
				onToggle={() => {}}
				onSelectAll={() => {}}
				onClearSelection={() => {}}
				hasBulk={false}
				hasRowActions={false}
				onSort={() => {}}
				hasActiveFilters={false}
				onResetFilters={() => {}}
				reorderColumn={over.reorderColumn}
				reorderEnabled={over.reorderEnabled}
				reorderRows={() => Promise.resolve({})}
				onRefresh={() => {}}
				emptyState={over.emptyState}
				recordUrl={over.recordUrl}
				groups={over.groups}
			/>
		</Wrap>
	);
}

function renderGrid(over: Overrides = {}) {
	return render(gridElement(over));
}

describe("TableGrid reorder rendering", () => {
	test("renders per-row drag handles and no hint when reorder is enabled", () => {
		const { queryByTestId } = renderGrid({ reorderColumn: "sort_order", reorderEnabled: true });

		expect(queryByTestId("reorder-handle-1")).not.toBeNull();
		expect(queryByTestId("reorder-handle-2")).not.toBeNull();
		expect(queryByTestId("reorder-disabled-hint")).toBeNull();
	});

	test("renders the disabled hint and no drag handles when reorder is blocked", () => {
		const { queryByTestId } = renderGrid({
			reorderColumn: "sort_order",
			reorderEnabled: false,
		});

		expect(queryByTestId("reorder-disabled-hint")).not.toBeNull();
		expect(queryByTestId("reorder-handle-1")).toBeNull();
	});

	test("renders no handles and no hint when the table is not reorderable", () => {
		const { queryByTestId } = renderGrid({});

		expect(queryByTestId("reorder-disabled-hint")).toBeNull();
		expect(queryByTestId("reorder-handle-1")).toBeNull();
	});

	test("empty-state colSpan includes the handle column only when active", () => {
		const active = renderGrid({ reorderColumn: "sort_order", reorderEnabled: true, rows: [] });
		const activeCell = active.container.querySelector("td[colspan]");
		expect(activeCell?.getAttribute("colspan")).toBe("2");

		const blocked = renderGrid({
			reorderColumn: "sort_order",
			reorderEnabled: false,
			rows: [],
		});
		const blockedCell = blocked.container.querySelector("td[colspan]");
		expect(blockedCell?.getAttribute("colspan")).toBe("1");
	});
});

describe("TableGrid record URL + empty-state config", () => {
	test("empty state uses the configured heading and icon", () => {
		const { getByTestId } = renderGrid({
			rows: [],
			emptyState: { heading: "No widgets yet", icon: "star" },
		});
		const empty = getByTestId("table-empty");
		expect(empty.textContent).toContain("No widgets yet");
		expect(empty.querySelector("svg.lucide-star")).not.toBeNull();
	});

	test("rows become clickable when recordUrl is set and the row carries a url", () => {
		const { getByTestId } = renderGrid({
			rows: [{ id: "1", title: "a", _recordUrl: "/admin/posts/1" }],
			recordUrl: true,
		});
		const row = getByTestId("table-row-1");
		expect(row.className).toContain("cursor-pointer");
		expect(row.getAttribute("tabindex")).toBe("0");
	});

	test("rows stay non-clickable without recordUrl even if a url is present", () => {
		const { getByTestId } = renderGrid({
			rows: [{ id: "1", title: "a", _recordUrl: "/admin/posts/1" }],
		});
		expect(getByTestId("table-row-1").className).not.toContain("cursor-pointer");
	});
});

describe("TableGrid row grouping", () => {
	const GROUPED_ROWS = [
		{ id: "1", title: "a", status: "draft" },
		{ id: "2", title: "b", status: "draft" },
		{ id: "3", title: "c", status: "published" },
	];

	test("renders a group header before each contiguous run when groups is set", () => {
		const { container } = renderGrid({
			rows: GROUPED_ROWS,
			groups: { column: "status" },
			columns: GROUPABLE_COLUMNS,
		});
		const headerRows = container.querySelectorAll("tr.bg-muted\\/50");
		expect(headerRows).toHaveLength(2);
		expect(headerRows[0]?.textContent).toContain("draft");
		expect(headerRows[1]?.textContent).toContain("published");
	});

	// groups() only requires a matching defaultSort, so column visibility or
	// hiddenByDefault can drop the grouped column from the columns TableGrid gets.
	test("renders group headers when the grouped column is not among the displayed columns", () => {
		const { container } = renderGrid({
			rows: GROUPED_ROWS,
			groups: { column: "status" },
			columns: COLUMNS,
		});
		const headerRows = container.querySelectorAll("tr.bg-muted\\/50");
		expect(headerRows).toHaveLength(2);
		expect(headerRows[0]?.textContent).toContain("draft");
		expect(headerRows[1]?.textContent).toContain("published");
	});

	// A refetch, poll or page change swaps rows in place (useAsyncQuery keeps
	// the grid mounted while reloading), so the collapse state must survive it.
	test("keeps a collapsed group collapsed when the rows are replaced", () => {
		const over = {
			rows: GROUPED_ROWS,
			groups: { column: "status", collapsible: true },
			columns: GROUPABLE_COLUMNS,
		};
		const { getAllByTestId, queryByText, rerender } = renderGrid(over);
		const [draftToggle] = getAllByTestId("table-group-toggle");
		if (!draftToggle) {
			throw new Error("missing toggle");
		}
		fireEvent.click(draftToggle);

		rerender(
			gridElement({
				...over,
				rows: [{ id: "4", title: "d", status: "draft" }, ...GROUPED_ROWS],
			}),
		);

		const toggles = getAllByTestId("table-group-toggle");
		expect(toggles.map((t) => t.getAttribute("aria-expanded"))).toEqual(["false", "true"]);
		expect(queryByText("d")).toBeNull();
		expect(queryByText("c")).toBeTruthy();
	});

	test("skips grouping entirely while reorder is active, even with groups set", () => {
		const { container } = renderGrid({
			rows: GROUPED_ROWS,
			groups: { column: "status" },
			columns: GROUPABLE_COLUMNS,
			reorderColumn: "position",
			reorderEnabled: true,
		});
		// GroupHeaderRow is the only <tr> styled bg-muted/50 — its absence proves
		// no group header rendered, regardless of "draft"/"published" also
		// appearing as ordinary per-row cell text now that status is a column.
		expect(container.querySelectorAll("tr.bg-muted\\/50")).toHaveLength(0);
	});
});
