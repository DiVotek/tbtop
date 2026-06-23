/**
 * TableGrid reorder render rules (static — no pointer drag):
 * - reorder enabled: leading handle column + per-row drag handles, no hint
 * - reorder disabled: no drag handles, disabled hint shown
 * - colSpan accounts for the handle column only when reorder is active
 */
import { describe, expect, test } from "bun:test";
import { render } from "@testing-library/react";
import type { TableEmptyState } from "../tableBlock.types";
import { wrapForStructure } from "../testFixtures";
import type { TableColumn } from "../types";
import { TableGrid } from "./grid";

// Real provider chain (not a global module mock) so rows resolve the action
// context without leaking a stub into other files — mock.module is process-wide.
const Wrap = wrapForStructure(() => new Response("{}"));

const COLUMNS: TableColumn[] = [{ name: "title", label: "Title" }];
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
}

function renderGrid(over: Overrides = {}) {
	return render(
		<Wrap>
			<TableGrid
				rows={over.rows ?? ROWS}
				columns={COLUMNS}
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
			/>
		</Wrap>,
	);
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
