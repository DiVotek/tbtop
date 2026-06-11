/**
 * Pagination UI — counter, page buttons, per-page selector, URL persistence.
 */
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { act, fireEvent, render, waitFor } from "@testing-library/react";
import { renderNode } from "../../render/structureRenderer";
import { s } from "../structure";
import { wrapForStructure as wrap } from "../testFixtures";

beforeEach(() => {
	window.history.replaceState(null, "", "http://localhost/");
});
afterEach(() => {
	window.history.replaceState(null, "", "http://localhost/");
});

function makePaginatedTable(total: number, perPage = 25) {
	return s.table({
		name: "items",
		query: async () => ({
			data: Array.from({ length: perPage }, (_, i) => ({
				id: String(i + 1),
				title: `Row ${i}`,
			})),
			total,
			page: 1,
			perPage,
		}),
		columns: [{ name: "title", label: "Title" }],
		pagination: { perPage, options: [10, 25, 50] },
	} as Parameters<typeof s.table>[0]);
}

describe("TablePagination: record range counter", () => {
	test("shows '1–25 of 100' for first page", async () => {
		const node = makePaginatedTable(100, 25);
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);
		const range = await findByTestId("pagination-range");
		expect(range.textContent).toBe("1–25 of 100");
	});

	test("shows '0' when total is 0", async () => {
		const node = s.table({
			name: "empty",
			query: async () => ({ data: [], total: 0, page: 1, perPage: 25 }),
			columns: [{ name: "title" }],
			pagination: { perPage: 25, options: [25] },
		} as Parameters<typeof s.table>[0]);
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);
		const range = await findByTestId("pagination-range");
		expect(range.textContent).toBe("0");
	});
});

describe("TablePagination: page navigation", () => {
	test("prev button is disabled on page 1", async () => {
		const node = makePaginatedTable(100);
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);
		const prev = await findByTestId("pagination-prev");
		expect(prev).toHaveProperty("disabled", true);
	});

	test("next button is disabled on last page", async () => {
		// 25 rows, 25 perPage → 1 page total
		const node = makePaginatedTable(25, 25);
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);
		const next = await findByTestId("pagination-next");
		expect(next).toHaveProperty("disabled", true);
	});

	test("clicking page 2 updates URL with namespaced page param", async () => {
		const replaceStateCalls: string[] = [];
		const origReplaceState = window.history.replaceState.bind(window.history);
		window.history.replaceState = (state, title, url) => {
			if (url != null) {
				replaceStateCalls.push(String(url));
			}
			origReplaceState(state, title, url);
		};

		try {
			const node = makePaginatedTable(100, 25);
			const Wrap = wrap(() => new Response("{}"));
			const { findByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);
			const page2 = await findByTestId("pagination-page-2");
			await act(async () => {
				fireEvent.click(page2);
			});

			// URL encodes as t[items][page]=2 (brackets may be %-encoded)
			await waitFor(
				() => {
					const found = replaceStateCalls.some(
						(u) => u.includes("page%5D=2") || u.includes("page]=2"),
					);
					expect(found).toBe(true);
				},
				{ timeout: 1000 },
			);
		} finally {
			window.history.replaceState = origReplaceState;
		}
	});
});

describe("TablePagination: per-page not shown without pagination option", () => {
	test("pagination footer absent when pagination option not provided", async () => {
		const node = s.table({
			query: async () => [{ id: "1", title: "A" }],
			columns: [{ name: "title" }],
		});
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId, queryByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);
		await findByTestId("table-block");
		expect(queryByTestId("table-pagination")).toBeNull();
	});
});
