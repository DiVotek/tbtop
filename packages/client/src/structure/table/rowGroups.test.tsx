/**
 * Row grouping: partitionRowGroups contiguous-run partitioning, and
 * GroupHeaderRow's rendered label/colSpan.
 */
import { describe, expect, test } from "bun:test";
import { render } from "@testing-library/react";
import { GroupHeaderRow, partitionRowGroups } from "./rowGroups";

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
	test("renders the group value as text", () => {
		const { getByText } = render(
			<table>
				<tbody>
					<GroupHeaderRow value="published" colSpan={3} />
				</tbody>
			</table>,
		);
		expect(getByText("published")).toBeTruthy();
	});

	test("renders an em dash for a null/empty group value", () => {
		const { getByText } = render(
			<table>
				<tbody>
					<GroupHeaderRow value={null} colSpan={3} />
				</tbody>
			</table>,
		);
		expect(getByText("—")).toBeTruthy();
	});

	test("applies colSpan to the single cell", () => {
		const { container } = render(
			<table>
				<tbody>
					<GroupHeaderRow value="x" colSpan={5} />
				</tbody>
			</table>,
		);
		const td = container.querySelector("td");
		expect(td?.getAttribute("colspan")).toBe("5");
	});
});
