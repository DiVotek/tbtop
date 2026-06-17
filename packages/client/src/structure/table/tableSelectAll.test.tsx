/**
 * Select-all checkbox in header: selects / deselects page, indeterminate state,
 * selected count shown in bulk actions bar.
 */
import { describe, expect, test } from "bun:test";
import { act, fireEvent, render, waitFor } from "@testing-library/react";
import { renderNode } from "../../render/structureRenderer";
import { s } from "../structure";
import { wrapForStructure as wrap } from "../testFixtures";

function makeTableWithBulk() {
	return s.table({
		query: async () => [
			{ id: "a", title: "A" },
			{ id: "b", title: "B" },
			{ id: "c", title: "C" },
		],
		columns: [{ name: "title", label: "Title" }],
		bulkActions: [{ name: "do", handler: async () => {} }],
	});
}

describe("TableSelectAll", () => {
	test("select-all checkbox exists when bulkActions are configured", async () => {
		const node = makeTableWithBulk();
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);
		const cb = await findByTestId("table-select-all");
		expect(cb).toBeTruthy();
	});

	test("clicking select-all checks all row checkboxes", async () => {
		const node = makeTableWithBulk();
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);
		const selectAll = await findByTestId("table-select-all");

		await act(async () => {
			fireEvent.click(selectAll);
		});

		await waitFor(async () => {
			for (const id of ["a", "b", "c"]) {
				const cb = await findByTestId(`table-select-${id}`);
				expect((cb as HTMLInputElement).checked).toBe(true);
			}
		});
	});

	test("clicking select-all twice deselects all", async () => {
		const node = makeTableWithBulk();
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);
		const selectAll = await findByTestId("table-select-all");

		await act(async () => {
			fireEvent.click(selectAll);
		});
		await act(async () => {
			fireEvent.click(selectAll);
		});

		await waitFor(async () => {
			for (const id of ["a", "b", "c"]) {
				const cb = await findByTestId(`table-select-${id}`);
				expect((cb as HTMLInputElement).checked).toBe(false);
			}
		});
	});

	test("selected count shown next to bulk actions after selecting rows", async () => {
		const node = makeTableWithBulk();
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);

		const checkboxA = await findByTestId("table-select-a");
		await act(async () => {
			fireEvent.click(checkboxA);
		});

		const countEl = await findByTestId("bulk-selected-count");
		expect(countEl.textContent).toContain("1");
	});

	test("bulk action buttons hidden until a row is selected", async () => {
		const node = makeTableWithBulk();
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId, queryByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);

		await findByTestId("table-select-a");
		expect(queryByTestId("action-do")).toBeNull();

		const checkboxA = await findByTestId("table-select-a");
		await act(async () => {
			fireEvent.click(checkboxA);
		});

		expect(await findByTestId("action-do")).toBeTruthy();
	});

	test("select-all not present when no bulkActions", async () => {
		const node = s.table({
			query: async () => [{ id: "a", title: "A" }],
			columns: [{ name: "title" }],
		});
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId, queryByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);
		await findByTestId("table-block");
		expect(queryByTestId("table-select-all")).toBeNull();
	});
});
