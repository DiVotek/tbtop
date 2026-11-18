/**
 * groups(..., collapsible): the open/closed groups of a named table are kept
 * in localStorage under the table's name and grouped column.
 */
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { act, fireEvent, render } from "@testing-library/react";
import { renderNode } from "../render/structureRenderer";
import { s } from "./structure";
import { wrapForStructure as wrap } from "./testFixtures";

const KEY = "tbtop:table.posts.groups.status.v1";

beforeEach(() => {
	localStorage.clear();
});

afterEach(() => {
	localStorage.clear();
});

function makeTable() {
	return s.table({
		name: "posts",
		query: async () => [
			{ id: "1", title: "Dune", status: "draft" },
			{ id: "2", title: "Emma", status: "published" },
		],
		columns: [
			{ name: "title", label: "Title" },
			{ name: "status", label: "Status" },
		],
		defaultSort: { field: "status", dir: "asc" },
		groups: { column: "status", collapsible: true, collapsed: true },
	} as Parameters<typeof s.table>[0]);
}

async function renderTable() {
	const Wrap = wrap(() => new Response("{}"));
	const view = render(<Wrap>{renderNode(makeTable())}</Wrap>);
	await view.findAllByTestId("table-group-toggle");
	return view;
}

describe("collapsible row groups on a named table", () => {
	test("opening a group stores it under the table and column", async () => {
		const { getAllByTestId, findByText } = await renderTable();
		const [draft] = getAllByTestId("table-group-toggle");
		if (!draft) {
			throw new Error("missing toggle");
		}
		act(() => {
			fireEvent.click(draft);
		});
		await findByText("Dune");
		expect(JSON.parse(localStorage.getItem(KEY) ?? "{}")).toEqual({ '"draft"': false });
	});

	test("a stored open group renders open on the next mount", async () => {
		localStorage.setItem(KEY, JSON.stringify({ '"published"': false }));
		const { findByText, queryByText } = await renderTable();
		await findByText("Emma");
		expect(queryByText("Dune")).toBeNull();
	});
});
