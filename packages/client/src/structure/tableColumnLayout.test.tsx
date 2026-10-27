/**
 * Table column order and widths, end to end through the table block: the
 * saved layout reorders headers and cells, Alt+↓ in the Columns menu moves a
 * column, dragging the header grip sets a width, and reset restores the
 * declared layout.
 */
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { act, fireEvent, render, waitFor } from "@testing-library/react";
import { renderNode } from "../render/structureRenderer";
import { s } from "./structure";
import { wrapForStructure as wrap } from "./testFixtures";

const KEY = "tbtop:table.books.layout.v1";

beforeEach(() => {
	localStorage.clear();
});

afterEach(() => {
	localStorage.clear();
});

function makeTable() {
	return s.table({
		name: "books",
		query: async () => [{ id: "1", title: "Dune", author: "Herbert", year: 1965 }],
		columns: [
			{ name: "title", label: "Title" },
			{ name: "author", label: "Author" },
			{ name: "year", label: "Year" },
		],
	} as Parameters<typeof s.table>[0]);
}

async function renderTable() {
	const Wrap = wrap(() => new Response("{}"));
	const view = render(<Wrap>{renderNode(makeTable())}</Wrap>);
	await view.findByText("Dune");
	return view;
}

function headers(container: HTMLElement): string[] {
	return Array.from(container.querySelectorAll("table thead th")).map(
		(th) => th.textContent ?? "",
	);
}

function firstRowCells(container: HTMLElement): string[] {
	return Array.from(container.querySelectorAll("table tbody tr:first-child td")).map(
		(td) => td.textContent ?? "",
	);
}

function openMenu(trigger: HTMLElement): void {
	fireEvent.pointerDown(trigger, { bubbles: true, cancelable: true, isPrimary: true });
	fireEvent.click(trigger);
}

describe("Table: column layout", () => {
	test("a saved order reorders headers and cells; new columns go last", async () => {
		localStorage.setItem(KEY, JSON.stringify({ order: ["year", "title"], widths: {} }));

		const { container } = await renderTable();

		expect(headers(container)).toEqual(["Year", "Title", "Author"]);
		expect(firstRowCells(container)).toEqual(["1965", "Dune", "Herbert"]);
	});

	test("a saved width applies to the header and the cells", async () => {
		localStorage.setItem(KEY, JSON.stringify({ order: [], widths: { author: 180 } }));

		const { container } = await renderTable();

		const th = container.querySelectorAll<HTMLElement>("table thead th")[1];
		const td = container.querySelectorAll<HTMLElement>("table tbody td")[1];
		expect(th?.style.width).toBe("180px");
		expect(td?.style.width).toBe("180px");
	});

	test("Alt+ArrowDown in the Columns menu moves a column right", async () => {
		const { container, getByTestId } = await renderTable();

		act(() => openMenu(getByTestId("column-visibility-trigger")));
		act(() => {
			fireEvent.keyDown(getByTestId("column-toggle-title"), {
				key: "ArrowDown",
				altKey: true,
			});
		});

		await waitFor(() => expect(headers(container)).toEqual(["Author", "Title", "Year"]));
		expect(JSON.parse(localStorage.getItem(KEY) ?? "{}").order).toEqual([
			"author",
			"title",
			"year",
		]);
	});

	test("dragging the header grip sets the column width", async () => {
		const { container, getByTestId } = await renderTable();
		const grip = getByTestId("column-resize-title");
		grip.setPointerCapture = () => {};

		act(() => {
			fireEvent.pointerDown(grip, { button: 0, clientX: 100, pointerId: 1 });
			fireEvent.pointerMove(grip, { clientX: 260, pointerId: 1 });
			fireEvent.pointerUp(grip, { pointerId: 1 });
		});

		// happy-dom lays nothing out, so the drag starts from a 0px header.
		const th = container.querySelector<HTMLElement>("table thead th");
		await waitFor(() => expect(th?.style.width).toBe("160px"));
	});

	test("reset restores the declared order and widths", async () => {
		localStorage.setItem(KEY, JSON.stringify({ order: ["year"], widths: { title: 200 } }));
		const { container, getByTestId } = await renderTable();

		act(() => openMenu(getByTestId("column-visibility-trigger")));
		act(() => {
			fireEvent.click(getByTestId("column-layout-reset"));
		});

		await waitFor(() => expect(headers(container)).toEqual(["Title", "Author", "Year"]));
		expect(container.querySelector<HTMLElement>("table thead th")?.style.width).toBe("");
		expect(localStorage.getItem(KEY)).toBeNull();
	});
});
