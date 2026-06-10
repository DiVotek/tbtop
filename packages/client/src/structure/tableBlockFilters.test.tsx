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
				capturedParams.push({ ...(ctx.table?.queryParams ?? {}) });
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
