/**
 * rowClick targeting a modal action: the row click opens the action's modal —
 * including when the action itself is hidden (meta hidden: true), the
 * "clickable row, no visible Edit button" pattern.
 */
import { describe, expect, test } from "bun:test";
import { fireEvent, render } from "@testing-library/react";
import { renderNode } from "../../render/structureRenderer";
import { s } from "../structure";
import { wrapForStructure as wrap } from "../testFixtures";

function modalTable(meta?: Record<string, unknown>) {
	return s.table({
		query: async () => [{ id: "1", name: "About us" }],
		columns: [{ name: "name", label: "Title" }],
		rowClick: "edit",
		rowActions: [
			{
				name: "edit",
				label: "Edit",
				modal: {
					title: "Edit page",
					body: (sb: typeof s) => sb.row([]),
				},
				...(meta ? { meta } : {}),
			},
		],
	} as Parameters<typeof s.table>[0]);
}

function clickRow(row: Element) {
	fireEvent.pointerDown(row, { bubbles: true, isPrimary: true });
	fireEvent.click(row, { bubbles: true });
}

describe("TableRow — rowClick on a modal action", () => {
	test("clicking the row opens the modal action's dialog", async () => {
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId, findByText } = render(<Wrap>{renderNode(modalTable())}</Wrap>);
		await findByTestId("table-block");
		clickRow(await findByTestId("table-row-1"));
		expect(await findByText("Edit page")).toBeTruthy();
	});

	test("works when the action is statically hidden (no visible button, row still opens it)", async () => {
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId, findByText, queryByTestId } = render(
			<Wrap>{renderNode(modalTable({ hidden: true }))}</Wrap>,
		);
		await findByTestId("table-block");
		expect(queryByTestId("action-edit")).toBeNull();
		clickRow(await findByTestId("table-row-1"));
		expect(await findByText("Edit page")).toBeTruthy();
	});
});
