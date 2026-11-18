/**
 * Row grouping: partitionRowGroups contiguous-run partitioning,
 * GroupHeaderRow's rendered label/colSpan, and GroupedRows' collapse toggle.
 */
import { afterEach, beforeAll, describe, expect, test } from "bun:test";
import { fireEvent, render } from "@testing-library/react";
import { ensureBuiltinsRegistered } from "../../render/registerBuiltins";
import type { TableColumn } from "../types";
import { GroupedRows, GroupHeaderRow, partitionRowGroups } from "./rowGroups";

beforeAll(() => {
	ensureBuiltinsRegistered();
});

const textCol: TableColumn = { name: "status" };

describe("partitionRowGroups", () => {
	test("returns one group per contiguous run of a shared value", () => {
		const draft1 = { id: "1", status: "draft" };
		const draft2 = { id: "2", status: "draft" };
		const published = { id: "3", status: "published" };
		const groups = partitionRowGroups([draft1, draft2, published], "status");
		expect(groups).toEqual([
			{ value: "draft", rows: [draft1, draft2] },
			{ value: "published", rows: [published] },
		]);
	});

	test("starts a new group when a value repeats non-contiguously", () => {
		const rows = [
			{ id: "1", status: "draft" },
			{ id: "2", status: "published" },
			{ id: "3", status: "draft" },
		];
		const groups = partitionRowGroups(rows, "status");
		expect(groups).toHaveLength(3);
		expect(groups.map((g) => g.value)).toEqual(["draft", "published", "draft"]);
	});

	test("returns an empty list for an empty row set", () => {
		expect(partitionRowGroups([], "status")).toEqual([]);
	});

	test("groups rows sharing a missing/undefined column value together", () => {
		const rows = [{ id: "1" }, { id: "2" }];
		const groups = partitionRowGroups(rows, "status");
		expect(groups).toEqual([{ value: undefined, rows }]);
	});
});

describe("GroupHeaderRow", () => {
	test("renders a plain text column's value as-is", () => {
		const { getByText } = render(
			<table>
				<tbody>
					<GroupHeaderRow value="published" colSpan={3} column={textCol} />
				</tbody>
			</table>,
		);
		expect(getByText("published")).toBeTruthy();
	});

	test("renders an em dash for a null/empty group value", () => {
		const { getByText } = render(
			<table>
				<tbody>
					<GroupHeaderRow value={null} colSpan={3} column={textCol} />
				</tbody>
			</table>,
		);
		expect(getByText("—")).toBeTruthy();
	});

	test("applies colSpan to the single cell", () => {
		const { container } = render(
			<table>
				<tbody>
					<GroupHeaderRow value="x" colSpan={5} column={textCol} />
				</tbody>
			</table>,
		);
		const td = container.querySelector("td");
		expect(td?.getAttribute("colspan")).toBe("5");
	});

	test("renders a select column's configured option label, not its raw value", () => {
		const selectCol: TableColumn = {
			name: "status",
			kind: "select",
			editable: { as: "select", options: [{ value: "draft", label: "Draft" }] },
		};
		const { getByText, queryByText } = render(
			<table>
				<tbody>
					<GroupHeaderRow value="draft" colSpan={3} column={selectCol} />
				</tbody>
			</table>,
		);
		expect(getByText("Draft")).toBeTruthy();
		expect(queryByText("draft")).toBeNull();
	});

	test("renders a boolean column through the same icon cell the column uses, not the raw string", () => {
		const booleanCol: TableColumn = { name: "published", kind: "boolean" };
		const { container, queryByText } = render(
			<table>
				<tbody>
					<GroupHeaderRow value={true} colSpan={3} column={booleanCol} />
				</tbody>
			</table>,
		);
		// BooleanIconCell renders an SVG icon (aria-hidden), never the literal "true".
		expect(queryByText("true")).toBeNull();
		expect(container.querySelector("svg")).toBeTruthy();
	});

	test("renders a badge column through the same Badge component the cell uses, not a bare text node", () => {
		const badgeCol: TableColumn = { name: "priority", kind: "badge" };
		const { container } = render(
			<table>
				<tbody>
					<GroupHeaderRow value="high" colSpan={3} column={badgeCol} />
				</tbody>
			</table>,
		);
		expect(container.querySelector('[data-slot="badge"]')).toBeTruthy();
	});
});

const GROUPED = [
	{ id: "1", status: "draft" },
	{ id: "2", status: "draft" },
	{ id: "3", status: "published" },
];

function renderGrouped(collapsedByDefault: boolean, collapsible = true, storageKey?: string) {
	return render(
		<table>
			<tbody>
				<GroupedRows
					rows={GROUPED}
					column={textCol}
					colSpan={2}
					collapsible={collapsible}
					collapsedByDefault={collapsedByDefault}
					storageKey={storageKey}
					renderRow={(row) => (
						<tr key={String(row.id)} data-testid="data-row">
							<td>{String(row.id)}</td>
						</tr>
					)}
				/>
			</tbody>
		</table>,
	);
}

describe("GroupedRows", () => {
	test("without collapsible renders plain headers and every row", () => {
		const { getAllByTestId, queryAllByTestId, getByText } = renderGrouped(false, false);
		expect(queryAllByTestId("table-group-toggle")).toHaveLength(0);
		expect(getAllByTestId("data-row")).toHaveLength(3);
		expect(getByText("draft").closest("button")).toBeNull();
	});

	test("renders every group expanded by default", () => {
		const { getAllByTestId } = renderGrouped(false);
		expect(getAllByTestId("data-row")).toHaveLength(3);
		const toggles = getAllByTestId("table-group-toggle");
		expect(toggles.map((t) => t.getAttribute("aria-expanded"))).toEqual(["true", "true"]);
	});

	test("a header click hides only that group's rows, a second click shows them again", () => {
		const { getAllByTestId } = renderGrouped(false);
		const [draftToggle] = getAllByTestId("table-group-toggle");
		if (!draftToggle) {
			throw new Error("missing toggle");
		}
		fireEvent.click(draftToggle);
		expect(getAllByTestId("data-row").map((r) => r.textContent)).toEqual(["3"]);
		expect(draftToggle.getAttribute("aria-expanded")).toBe("false");
		fireEvent.click(draftToggle);
		expect(getAllByTestId("data-row")).toHaveLength(3);
	});

	test("collapsedByDefault renders headers only until a group is opened", () => {
		const { getAllByTestId, queryAllByTestId } = renderGrouped(true);
		expect(queryAllByTestId("data-row")).toHaveLength(0);
		expect(getAllByTestId("table-group-toggle")).toHaveLength(2);
		const publishedToggle = getAllByTestId("table-group-toggle")[1];
		if (!publishedToggle) {
			throw new Error("missing toggle");
		}
		fireEvent.click(publishedToggle);
		expect(getAllByTestId("data-row").map((r) => r.textContent)).toEqual(["3"]);
	});
});

describe("GroupedRows with a storage key", () => {
	const KEY = "tbtop:table.posts.groups.status.v1";

	afterEach(() => {
		localStorage.clear();
	});

	function toggleAt(getAllByTestId: (id: string) => HTMLElement[], index: number): void {
		const toggle = getAllByTestId("table-group-toggle")[index];
		if (!toggle) {
			throw new Error("missing toggle");
		}
		fireEvent.click(toggle);
	}

	test("a group the user opened stays open after a remount", () => {
		const first = renderGrouped(true, true, KEY);
		toggleAt(first.getAllByTestId, 1);
		first.unmount();

		const { getAllByTestId } = renderGrouped(true, true, KEY);
		expect(getAllByTestId("data-row").map((r) => r.textContent)).toEqual(["3"]);
	});

	test("a group the user closed stays closed after a remount", () => {
		const first = renderGrouped(false, true, KEY);
		toggleAt(first.getAllByTestId, 0);
		first.unmount();

		const { getAllByTestId } = renderGrouped(false, true, KEY);
		expect(getAllByTestId("data-row").map((r) => r.textContent)).toEqual(["3"]);
	});

	test("the stored state is explicit, so it survives a change of the declared default", () => {
		localStorage.setItem(KEY, JSON.stringify({ '"published"': false }));
		const { getAllByTestId } = renderGrouped(true, true, KEY);
		expect(getAllByTestId("data-row").map((r) => r.textContent)).toEqual(["3"]);
	});

	test("malformed storage falls back to the declared default", () => {
		localStorage.setItem(KEY, "not json");
		const { queryAllByTestId } = renderGrouped(true, true, KEY);
		expect(queryAllByTestId("data-row")).toHaveLength(0);
	});

	test("a new storage key on a mounted table reads its own state, not the old key's", () => {
		const view = renderGrouped(false, true, KEY);
		toggleAt(view.getAllByTestId, 0);
		const otherKey = "tbtop:table.posts.groups.author.v1";
		view.rerender(
			<table>
				<tbody>
					<GroupedRows
						rows={GROUPED}
						column={textCol}
						colSpan={2}
						collapsible
						collapsedByDefault={false}
						storageKey={otherKey}
						renderRow={(row) => (
							<tr key={String(row.id)} data-testid="data-row">
								<td>{String(row.id)}</td>
							</tr>
						)}
					/>
				</tbody>
			</table>,
		);
		expect(view.getAllByTestId("data-row")).toHaveLength(3);
		expect(localStorage.getItem(otherKey)).toBeNull();
	});

	test("a toggle keeps groups another tab stored meanwhile", () => {
		const { getAllByTestId } = renderGrouped(false, true, KEY);
		localStorage.setItem(KEY, JSON.stringify({ '"published"': true }));
		toggleAt(getAllByTestId, 0);
		expect(JSON.parse(localStorage.getItem(KEY) ?? "{}")).toEqual({
			'"published"': true,
			'"draft"': true,
		});
	});

	test("a toggle still works when storage writes fail", () => {
		const real = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
		const failing = {
			getItem: () => null,
			setItem: () => {
				throw new Error("quota");
			},
		};
		Object.defineProperty(globalThis, "localStorage", {
			configurable: true,
			get: () => failing,
		});
		try {
			const { getAllByTestId } = renderGrouped(false, true, KEY);
			toggleAt(getAllByTestId, 0);
			expect(getAllByTestId("data-row").map((r) => r.textContent)).toEqual(["3"]);
		} finally {
			if (real) {
				Object.defineProperty(globalThis, "localStorage", real);
			}
		}
	});

	test("without a storage key nothing is written", () => {
		const { getAllByTestId } = renderGrouped(false);
		toggleAt(getAllByTestId, 0);
		expect(localStorage.length).toBe(0);
	});
});
