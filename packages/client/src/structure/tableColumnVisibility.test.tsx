/**
 * Table column visibility toggle + localStorage persistence.
 * Scenario 6 from slice D.
 */
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { act, fireEvent, render, waitFor } from "@testing-library/react";
import { renderNode } from "../render/structureRenderer";
import { s } from "./structure";
import { wrapForStructure as wrap } from "./testFixtures";

beforeEach(() => {
	localStorage.clear();
});

afterEach(() => {
	localStorage.clear();
});

function getTableHeaders(container: HTMLElement): string[] {
	return Array.from(container.querySelectorAll("table thead th")).map(
		(th) => th.textContent ?? "",
	);
}

describe("Table: column visibility", () => {
	test("TableColumnVisibility: toggle hides column from the grid", async () => {
		const node = s.table({
			query: async () => [{ id: "1", title: "Hello", views: 42 }],
			columns: [
				{ name: "title", label: "Title" },
				{ name: "views", label: "Views" },
			],
		});
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId, getByTestId, container } = render(<Wrap>{renderNode(node)}</Wrap>);
		await findByTestId("table-block");
		expect(getTableHeaders(container)).toContain("Title");
		expect(getTableHeaders(container)).toContain("Views");

		// Open dropdown and toggle off "Views"
		act(() => {
			fireEvent.click(getByTestId("column-visibility-trigger"));
		});
		act(() => {
			fireEvent.click(getByTestId("column-toggle-views"));
		});

		await waitFor(() => {
			expect(getTableHeaders(container)).not.toContain("Views");
		});
		expect(getTableHeaders(container)).toContain("Title");
	});

	test("TableColumnVisibility: hidden column restores when toggled on again", async () => {
		const node = s.table({
			query: async () => [{ id: "1", title: "Hello", views: 42 }],
			columns: [
				{ name: "title", label: "Title" },
				{ name: "views", label: "Views" },
			],
		});
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId, getByTestId, container } = render(<Wrap>{renderNode(node)}</Wrap>);
		await findByTestId("table-block");

		// Toggle views off
		act(() => {
			fireEvent.click(getByTestId("column-visibility-trigger"));
		});
		act(() => {
			fireEvent.click(getByTestId("column-toggle-views"));
		});
		await waitFor(() => expect(getTableHeaders(container)).not.toContain("Views"));

		// Toggle views on again (dropdown should still be open)
		act(() => {
			fireEvent.click(getByTestId("column-toggle-views"));
		});
		await waitFor(() => expect(getTableHeaders(container)).toContain("Views"));
	});

	test("TableColumnVisibility: persists toggled state to localStorage", async () => {
		const node = s.table({
			query: async () => [{ id: "1", title: "Hello", views: 42 }],
			columns: [
				{ name: "title", label: "Title" },
				{ name: "views", label: "Views" },
			],
		});
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId, getByTestId, container } = render(<Wrap>{renderNode(node)}</Wrap>);
		await findByTestId("table-block");

		act(() => {
			fireEvent.click(getByTestId("column-visibility-trigger"));
		});
		act(() => {
			fireEvent.click(getByTestId("column-toggle-views"));
		});
		await waitFor(() => expect(getTableHeaders(container)).not.toContain("Views"));

		const key = "tbtop.table.title-views.columns";
		const stored = localStorage.getItem(key);
		expect(stored).not.toBeNull();
		const parsed = JSON.parse(stored ?? "[]") as string[];
		expect(parsed).not.toContain("views");
		expect(parsed).toContain("title");
	});

	test("TableColumnVisibility: restores columns from localStorage on remount", async () => {
		const tableId = "title-views";
		localStorage.setItem(`tbtop.table.${tableId}.columns`, JSON.stringify(["title"]));

		const node = s.table({
			query: async () => [{ id: "1", title: "Hello", views: 42 }],
			columns: [
				{ name: "title", label: "Title" },
				{ name: "views", label: "Views" },
			],
		});
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId, container } = render(<Wrap>{renderNode(node)}</Wrap>);
		await findByTestId("table-block");

		await waitFor(() => {
			expect(getTableHeaders(container)).not.toContain("Views");
		});
		expect(getTableHeaders(container)).toContain("Title");
	});
});
