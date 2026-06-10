/**
 * Click-sort: asc → desc → clear, aria-sort, sortable vs non-sortable headers.
 */
import { describe, expect, test } from "bun:test";
import { act, fireEvent, render, waitFor } from "@testing-library/react";
import { renderNode } from "../../render/structureRenderer";
import { s } from "../structure";
import { wrapForStructure as wrap } from "../testFixtures";

function makeSortableTable() {
	return s.table({
		name: "posts",
		query: async () => [
			{ id: "1", title: "Alpha", views: 10 },
			{ id: "2", title: "Beta", views: 5 },
		],
		columns: [
			{ name: "title", label: "Title", sortable: true },
			{ name: "views", label: "Views" },
		],
	} as Parameters<typeof s.table>[0]);
}

describe("TableSort: sortable header", () => {
	test("sortable header has aria-sort='none' initially", async () => {
		const node = makeSortableTable();
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId, container } = render(<Wrap>{renderNode(node)}</Wrap>);
		await findByTestId("table-block");

		const ths = Array.from(container.querySelectorAll("thead th"));
		const titleTh = ths.find((th) => th.textContent?.includes("Title"));
		expect(titleTh?.getAttribute("aria-sort")).toBe("none");
	});

	test("non-sortable header has no aria-sort", async () => {
		const node = makeSortableTable();
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId, container } = render(<Wrap>{renderNode(node)}</Wrap>);
		await findByTestId("table-block");

		const ths = Array.from(container.querySelectorAll("thead th"));
		const viewsTh = ths.find((th) => th.textContent?.includes("Views"));
		expect(viewsTh?.getAttribute("aria-sort")).toBeNull();
	});

	test("clicking sortable header cycles asc → desc → clear", async () => {
		const capturedSorts: Array<string | undefined> = [];
		const node = s.table({
			name: "posts",
			query: async (ctx) => {
				capturedSorts.push(ctx.table?.queryParams.sort);
				return [{ id: "1", title: "Alpha" }];
			},
			columns: [{ name: "title", label: "Title", sortable: true }],
		} as Parameters<typeof s.table>[0]);

		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId, container } = render(<Wrap>{renderNode(node)}</Wrap>);
		await findByTestId("table-block");

		const getTitleTh = () =>
			Array.from(container.querySelectorAll("thead th")).find((th) =>
				th.textContent?.includes("Title"),
			) as HTMLElement;

		// Click 1: asc
		await act(async () => {
			fireEvent.click(getTitleTh());
		});
		await waitFor(() => {
			expect(capturedSorts.some((s) => s === "title:asc")).toBe(true);
		});

		// Click 2: desc
		await act(async () => {
			fireEvent.click(getTitleTh());
		});
		await waitFor(() => {
			expect(capturedSorts.some((s) => s === "title:desc")).toBe(true);
		});

		// Click 3: clear
		await act(async () => {
			fireEvent.click(getTitleTh());
		});
		await waitFor(() => {
			// After clear, last sort in captured params should be undefined
			const afterClear = capturedSorts[capturedSorts.length - 1];
			expect(afterClear).toBeUndefined();
		});
	});

	test("aria-sort updates to ascending after first click", async () => {
		const node = makeSortableTable();
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId, container } = render(<Wrap>{renderNode(node)}</Wrap>);
		await findByTestId("table-block");

		const getTitleTh = () =>
			Array.from(container.querySelectorAll("thead th")).find((th) =>
				th.textContent?.includes("Title"),
			) as HTMLElement;

		await act(async () => {
			fireEvent.click(getTitleTh());
		});

		await waitFor(() => {
			expect(getTitleTh().getAttribute("aria-sort")).toBe("ascending");
		});
	});
});
