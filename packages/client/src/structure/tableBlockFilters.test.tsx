/**
 * Table toolbar: search input, filters panel, column visibility.
 * Scenarios 5 and 6 from slice D.
 */
import { describe, expect, test } from "bun:test";
import { act, render, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderNode } from "../render/structureRenderer";
import { s } from "./structure";
import { wrapForStructure as wrap } from "./testFixtures";

// ---------------------------------------------------------------------------
// Scenario 5: search input emits debounced params
// ---------------------------------------------------------------------------
describe("TableToolbar: search", () => {
	test("TableToolbar: search input is present when searchable option provided", async () => {
		const rows = [{ id: "1", title: "Alpha" }];
		const node = s.table({
			query: async () => rows,
			columns: [{ name: "title" }],
			searchable: ["title"],
		} as Parameters<typeof s.table>[0]);
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);
		const input = await findByTestId("table-search-input");
		expect(input).toBeTruthy();
	});

	test("TableToolbar: search input absent when no searchable option", async () => {
		const node = s.table({
			query: async () => [{ id: "1", title: "Alpha" }],
			columns: [{ name: "title" }],
		});
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId, queryByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);
		await findByTestId("table-block");
		expect(queryByTestId("table-search-input")).toBeNull();
	});

	test("TableToolbar: typing in search input triggers refetch with search param", async () => {
		const capturedParams: Record<string, unknown>[] = [];
		const node = s.table({
			query: async (ctx) => {
				capturedParams.push({ ...ctx.table?.queryParams });
				return [{ id: "1", title: "Alpha" }];
			},
			columns: [{ name: "title" }],
			searchable: ["title"],
		} as Parameters<typeof s.table>[0]);

		const user = userEvent.setup({ delay: null });
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);

		await findByTestId("table-block");
		const input = await findByTestId("table-search-input");

		await act(async () => {
			await user.type(input, "alpha");
		});

		// After debounce (300ms), a new query should fire
		await waitFor(
			() => {
				const withSearch = capturedParams.find(
					(p) => typeof p.search === "string" && (p.search as string).length > 0,
				);
				expect(withSearch).toBeTruthy();
			},
			{ timeout: 1000 },
		);
	});
});

// ---------------------------------------------------------------------------
// Scenario 5b: filter badge counts active filters
// ---------------------------------------------------------------------------
describe("TableToolbar: filter badge", () => {
	test("TableToolbar: filter badge shows count of active (non-empty) filter values", async () => {
		const node = s.table({
			query: async () => [{ id: "1", title: "Alpha" }],
			columns: [{ name: "title" }],
			filters: [
				{ kind: "select", name: "status", options: { options: [] }, meta: {} },
				{ kind: "text", name: "author", options: {}, meta: {} },
			],
			filtersIn: "inline",
		} as Parameters<typeof s.table>[0]);
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId, queryByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);
		await findByTestId("table-block");
		// No active filters initially — badge should not be present or show 0
		const badge = queryByTestId("filter-badge");
		expect(!badge || badge.textContent === "" || badge.textContent === "0").toBe(true);
	});
});

// ---------------------------------------------------------------------------
// Scenario 5c: inline filters panel renders above table
// ---------------------------------------------------------------------------
describe("TableToolbar: inline filters", () => {
	test("TableToolbar: inline filtersIn renders filter fields above table", async () => {
		const node = s.table({
			query: async () => [{ id: "1", title: "Alpha" }],
			columns: [{ name: "title" }],
			filters: [{ kind: "text", name: "q", options: { label: "Search" }, meta: {} }],
			filtersIn: "inline",
		} as Parameters<typeof s.table>[0]);
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);
		await findByTestId("table-block");
		const panel = await findByTestId("table-filters-inline");
		expect(panel).toBeTruthy();
	});
});

// ---------------------------------------------------------------------------
// Scenario 5d: modal filters trigger button
// ---------------------------------------------------------------------------
describe("TableToolbar: modal filters", () => {
	test("TableToolbar: modal filtersIn renders a Filters trigger button", async () => {
		const node = s.table({
			query: async () => [{ id: "1", title: "Alpha" }],
			columns: [{ name: "title" }],
			filters: [{ kind: "text", name: "q", options: { label: "Q" }, meta: {} }],
			filtersIn: "modal",
		} as Parameters<typeof s.table>[0]);
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);
		await findByTestId("table-block");
		const trigger = await findByTestId("table-filters-trigger");
		expect(trigger).toBeTruthy();
	});
});

// ---------------------------------------------------------------------------
// Item 3: deferFilters gates narrowing behind an explicit Apply click
// ---------------------------------------------------------------------------
describe("TableToolbar: deferFilters", () => {
	test("filter change does not refetch until Apply is clicked", async () => {
		const capturedParams: Record<string, unknown>[] = [];
		const node = s.table({
			query: async (ctx) => {
				capturedParams.push({ ...ctx.table?.queryParams });
				return [{ id: "1", title: "Alpha" }];
			},
			columns: [{ name: "title" }],
			filters: [{ kind: "text", name: "author", options: { label: "Author" }, meta: {} }],
			filtersIn: "inline",
			deferFilters: true,
		} as Parameters<typeof s.table>[0]);

		const user = userEvent.setup({ delay: null });
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId, container } = render(<Wrap>{renderNode(node)}</Wrap>);
		await findByTestId("table-block");

		const input = container.querySelector<HTMLInputElement>('input[name="author"]');
		if (!input) {
			throw new Error("author filter input not found");
		}
		await act(async () => {
			await user.type(input, "jane");
		});

		// Give the (non-existent, since deferred) debounce window a chance to fire.
		const { promise: delayed, resolve: finishDelay } = Promise.withResolvers<void>();
		setTimeout(finishDelay, 350);
		await act(async () => {
			await delayed;
		});
		expect(capturedParams.some((p) => (p.filters as Record<string, unknown>)?.author)).toBe(
			false,
		);

		const applyBtn = await findByTestId("table-filters-apply");
		await act(async () => {
			await user.click(applyBtn);
		});

		await waitFor(() => {
			expect(
				capturedParams.some(
					(p) => (p.filters as Record<string, unknown>)?.author === "jane",
				),
			).toBe(true);
		});
	});

	test("Apply button is absent when deferFilters is not set", async () => {
		const node = s.table({
			query: async () => [{ id: "1", title: "Alpha" }],
			columns: [{ name: "title" }],
			filters: [{ kind: "text", name: "author", options: { label: "Author" }, meta: {} }],
			filtersIn: "inline",
		} as Parameters<typeof s.table>[0]);
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId, queryByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);
		await findByTestId("table-block");
		expect(queryByTestId("table-filters-apply")).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// searchInput / columnToggle / toolbar visibility toggles
// ---------------------------------------------------------------------------
describe("TableToolbar: searchInput/columnToggle visibility", () => {
	test("searchInput:false hides the search input even when searchable is set", async () => {
		const node = s.table({
			query: async () => [{ id: "1", title: "Alpha" }],
			columns: [{ name: "title" }],
			searchable: ["title"],
			searchInput: false,
		} as Parameters<typeof s.table>[0]);
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId, queryByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);
		await findByTestId("table-block");
		expect(queryByTestId("table-search-input")).toBeNull();
	});

	test("columnToggle:false hides the Columns dropdown", async () => {
		const node = s.table({
			query: async () => [{ id: "1", title: "Alpha" }],
			columns: [{ name: "title" }],
			columnToggle: false,
		} as Parameters<typeof s.table>[0]);
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId, queryByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);
		await findByTestId("table-block");
		expect(queryByTestId("column-visibility-trigger")).toBeNull();
	});

	test("without searchInput/columnToggle options, both render as before (back-compat)", async () => {
		const node = s.table({
			query: async () => [{ id: "1", title: "Alpha" }],
			columns: [{ name: "title" }],
			searchable: ["title"],
		} as Parameters<typeof s.table>[0]);
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);
		expect(await findByTestId("table-search-input")).toBeTruthy();
		expect(await findByTestId("column-visibility-trigger")).toBeTruthy();
	});

	test("searchInput:false + columnToggle:false hides both, tabs and headerActions stay", async () => {
		const node = s.table({
			query: async () => [{ id: "1", title: "Alpha" }],
			columns: [{ name: "title" }],
			searchable: ["title"],
			searchInput: false,
			columnToggle: false,
			tabs: [{ name: "all", label: "All", count: false }],
			headerActions: [{ name: "create", label: "Create", url: "/x" }],
		} as Parameters<typeof s.table>[0]);
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId, queryByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);
		await findByTestId("table-block");
		expect(queryByTestId("table-search-input")).toBeNull();
		expect(queryByTestId("column-visibility-trigger")).toBeNull();
		expect(await findByTestId("table-tabs")).toBeTruthy();
		expect(await findByTestId("table-header-actions")).toBeTruthy();
	});
});
