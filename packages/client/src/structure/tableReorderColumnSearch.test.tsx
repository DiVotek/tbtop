/**
 * Regression: a per-column search narrows the rows exactly like the table-wide
 * search, so it must block drag-reorder too. The reorder endpoint writes each
 * dragged id's index to the reorder column — on a filtered subset that
 * renumbers those rows from 0 and collides with the hidden rows' positions.
 */
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { render } from "@testing-library/react";
import { TableBlock } from "./tableBlock";
import { wrapForStructure } from "./testFixtures";

const rows = [
	{ id: "1", title: "Alpha" },
	{ id: "2", title: "Beta" },
];

function renderReorderable() {
	const Wrap = wrapForStructure(() => new Response(JSON.stringify({ data: rows })));
	const options = {
		name: "posts",
		query: async () => rows,
		columns: [{ name: "title", label: "Title" }],
		reorder: { column: "sort_order" },
		reorderRows: async () => ({}),
	};
	return render(
		<Wrap>
			<TableBlock options={options} />
		</Wrap>,
	);
}

describe("TableBlock reorder with a column search", () => {
	let originalHref: string;

	beforeEach(() => {
		originalHref = window.location.href;
	});

	afterEach(() => {
		window.history.replaceState(null, "", originalHref);
	});

	test("reorder stays enabled with no search active", async () => {
		const { findByTestId, queryByTestId } = renderReorderable();
		await findByTestId("table-block");
		expect(queryByTestId("reorder-handle-1")).not.toBeNull();
	});

	test("an active column search disables reorder", async () => {
		window.history.replaceState(null, "", "/?t%5Bposts%5D%5BcolSearch%5D%5Btitle%5D=alp");
		const { findByTestId, queryByTestId } = renderReorderable();
		await findByTestId("table-block");
		expect(queryByTestId("reorder-handle-1")).toBeNull();
		expect(queryByTestId("reorder-disabled-hint")).not.toBeNull();
	});
});
