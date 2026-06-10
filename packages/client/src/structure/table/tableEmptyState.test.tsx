/**
 * Empty state: no rows → centered block; active filters → different text + reset button.
 */
import { describe, expect, test } from "bun:test";
import { act, render, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderNode } from "../../render/structureRenderer";
import { s } from "../structure";
import { wrapForStructure as wrap } from "../testFixtures";

describe("TableEmptyState: no rows", () => {
	test("shows empty state block when query returns no rows", async () => {
		const node = s.table({
			query: async () => [],
			columns: [{ name: "title", label: "Title" }],
		});
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);
		const empty = await findByTestId("table-empty");
		expect(empty).toBeTruthy();
		expect(empty.textContent).toContain("No records");
	});

	test("shows paginated-response empty state when data array is empty", async () => {
		const node = s.table({
			query: async () => ({ data: [], total: 0, page: 1, perPage: 25 }),
			columns: [{ name: "title" }],
		} as Parameters<typeof s.table>[0]);
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);
		const empty = await findByTestId("table-empty");
		expect(empty.textContent).toContain("No records");
	});

	test("does NOT show empty state when rows are present", async () => {
		const node = s.table({
			query: async () => [{ id: "1", title: "A" }],
			columns: [{ name: "title" }],
		});
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId, queryByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);
		await findByTestId("table-block");
		expect(queryByTestId("table-empty")).toBeNull();
	});
});

describe("TableEmptyState: active search shows different text and reset", () => {
	test("empty + active search shows 'Nothing matches' text and reset button", async () => {
		let searchParam: string | undefined;
		const node = s.table({
			name: "posts",
			query: async (ctx) => {
				searchParam = ctx.table?.queryParams.search;
				return [];
			},
			columns: [{ name: "title", label: "Title" }],
			searchable: ["title"],
		} as Parameters<typeof s.table>[0]);

		const user = userEvent.setup({ delay: null });
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);
		await findByTestId("table-block");

		const searchInput = await findByTestId("table-search-input");
		await act(async () => {
			await user.type(searchInput, "xyz");
		});

		await waitFor(
			() => {
				expect(searchParam).toBeDefined();
			},
			{ timeout: 1000 },
		);

		const empty = await findByTestId("table-empty");
		expect(empty.textContent).toContain("Nothing matches");

		const resetBtn = await findByTestId("table-empty-reset");
		expect(resetBtn).toBeTruthy();
	});

	test("clicking reset from empty state clears search and re-fetches", async () => {
		const queries: Array<Record<string, unknown>> = [];
		const node = s.table({
			name: "posts",
			query: async (ctx) => {
				queries.push({ ...(ctx.table?.queryParams ?? {}) });
				return [];
			},
			columns: [{ name: "title" }],
			searchable: ["title"],
		} as Parameters<typeof s.table>[0]);

		const user = userEvent.setup({ delay: null });
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);
		await findByTestId("table-block");

		// Trigger search
		const searchInput = await findByTestId("table-search-input");
		await act(async () => {
			await user.type(searchInput, "abc");
		});
		await waitFor(() => expect(queries.some((q) => q.search)).toBe(true), { timeout: 1000 });

		// Click reset from empty state
		const resetBtn = await findByTestId("table-empty-reset");
		await act(async () => {
			await user.click(resetBtn);
		});

		await waitFor(
			() => {
				const last = queries[queries.length - 1];
				expect(last?.search).toBeUndefined();
			},
			{ timeout: 1000 },
		);
	});
});
