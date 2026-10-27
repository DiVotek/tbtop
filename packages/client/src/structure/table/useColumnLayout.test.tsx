/**
 * useColumnLayout rules:
 * - columns missing from the saved order go to the end, in declared order
 * - saved names of columns that no longer exist are ignored
 * - a move and a width persist under the versioned key and survive a remount
 * - a dragged width never goes below the minimum
 * - reset forgets the saved layout
 * - a corrupt stored value falls back to the declared layout, no crash
 */
import { beforeEach, describe, expect, test } from "bun:test";
import { act, render } from "@testing-library/react";
import type { TableColumn } from "../types";
import {
	applyColumnOrder,
	type ColumnLayout,
	MIN_COLUMN_WIDTH,
	useColumnLayout,
} from "./useColumnLayout";

const KEY = "tbtop:table.books.layout.v1";

const COLUMNS: TableColumn[] = [{ name: "title" }, { name: "author" }, { name: "year" }];

function names(columns: TableColumn[]): string[] {
	return columns.map((c) => c.name);
}

function renderLayout(columns: TableColumn[] = COLUMNS): { current: () => ColumnLayout } {
	let layout: ColumnLayout | undefined;
	function Harness() {
		layout = useColumnLayout(columns, "books");
		return null;
	}
	render(<Harness />);
	return {
		current: () => {
			if (!layout) {
				throw new Error("hook did not render");
			}
			return layout;
		},
	};
}

beforeEach(() => {
	localStorage.clear();
});

describe("applyColumnOrder", () => {
	test("columns missing from the saved order go to the end in declared order", () => {
		const ordered = applyColumnOrder(COLUMNS, ["year"]);

		expect(names(ordered)).toEqual(["year", "title", "author"]);
	});

	test("saved names of removed columns are ignored", () => {
		const ordered = applyColumnOrder(COLUMNS, ["gone", "author", "title"]);

		expect(names(ordered)).toEqual(["author", "title", "year"]);
	});
});

describe("useColumnLayout", () => {
	test("a move persists and survives a remount", () => {
		const first = renderLayout();
		act(() => first.current().moveColumn("year", "title"));

		expect(names(first.current().orderedColumns)).toEqual(["year", "title", "author"]);
		expect(names(renderLayout().current().orderedColumns)).toEqual(["year", "title", "author"]);
	});

	test("a width persists, clamped to the minimum", () => {
		const layout = renderLayout();
		act(() => layout.current().setWidth("title", 10));

		expect(layout.current().widths).toEqual({ title: MIN_COLUMN_WIDTH });
		expect(JSON.parse(localStorage.getItem(KEY) ?? "{}").widths).toEqual({
			title: MIN_COLUMN_WIDTH,
		});
	});

	test("clearing a width drops it back to the declared one", () => {
		localStorage.setItem(KEY, JSON.stringify({ order: [], widths: { title: 200 } }));
		const layout = renderLayout();
		act(() => layout.current().setWidth("title", undefined));

		expect(layout.current().widths).toEqual({});
	});

	test("reset forgets the saved layout", () => {
		localStorage.setItem(KEY, JSON.stringify({ order: ["year"], widths: { title: 200 } }));
		const layout = renderLayout();
		expect(layout.current().customized).toBe(true);

		act(() => layout.current().resetLayout());

		expect(names(layout.current().orderedColumns)).toEqual(["title", "author", "year"]);
		expect(layout.current().customized).toBe(false);
		expect(localStorage.getItem(KEY)).toBeNull();
	});

	test("a corrupt stored value falls back to the declared layout", () => {
		localStorage.setItem(KEY, JSON.stringify({ order: "year", widths: { title: "wide" } }));

		const layout = renderLayout().current();

		expect(names(layout.orderedColumns)).toEqual(["title", "author", "year"]);
		expect(layout.widths).toEqual({});
	});
});
