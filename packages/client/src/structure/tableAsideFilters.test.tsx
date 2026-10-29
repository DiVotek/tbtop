/**
 * filtersIn("aside"): the panel beside the table, its toolbar toggle,
 * filtersCollapsed() as the first-visit default, and the remembered toggle.
 */
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { act, fireEvent, render, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderNode } from "../render/structureRenderer";
import { s } from "./structure";
import { wrapForStructure as wrap } from "./testFixtures";
import type { ClientActionContext } from "./types";

const KEY = "tbtop:table.books.filtersAside.v1";

beforeEach(() => {
	localStorage.clear();
});

afterEach(() => {
	localStorage.clear();
});

function makeTable(
	opts: { collapsed?: boolean; query?: (ctx: ClientActionContext) => Promise<unknown> } = {},
) {
	return s.table({
		name: "books",
		query: opts.query ?? (async () => [{ id: "1", title: "Dune" }]),
		columns: [{ name: "title", label: "Title" }],
		filters: [{ kind: "text", name: "q", options: { label: "Query" }, meta: {} }],
		filtersIn: "aside",
		filtersCollapsed: opts.collapsed,
	} as Parameters<typeof s.table>[0]);
}

async function renderTable(opts: Parameters<typeof makeTable>[0] = {}) {
	const Wrap = wrap(() => new Response("{}"));
	const view = render(<Wrap>{renderNode(makeTable(opts))}</Wrap>);
	await view.findByText("Dune");
	return view;
}

describe("filtersIn aside", () => {
	test("renders the panel open with the filter fields", async () => {
		const { getByTestId } = await renderTable();
		const panel = getByTestId("table-filters-aside");
		expect(panel.textContent).toContain("Query");
		expect(getByTestId("table-filters-aside-toggle").getAttribute("aria-pressed")).toBe("true");
	});

	test("filtersCollapsed starts with the panel hidden", async () => {
		const { queryByTestId, getByTestId } = await renderTable({ collapsed: true });
		expect(queryByTestId("table-filters-aside")).toBeNull();
		expect(getByTestId("table-filters-aside-toggle").getAttribute("aria-pressed")).toBe(
			"false",
		);
	});

	test("the toolbar toggle hides the panel and remembers it", async () => {
		const { getByTestId, queryByTestId } = await renderTable();
		act(() => {
			fireEvent.click(getByTestId("table-filters-aside-toggle"));
		});
		expect(queryByTestId("table-filters-aside")).toBeNull();
		expect(localStorage.getItem(KEY)).toBe("closed");
	});

	test("a remembered toggle wins over filtersCollapsed", async () => {
		localStorage.setItem(KEY, "open");
		const { getByTestId } = await renderTable({ collapsed: true });
		expect(getByTestId("table-filters-aside")).toBeTruthy();
	});

	test("typing in a panel field refetches with the filter", async () => {
		const seen: Record<string, unknown>[] = [];
		const { getByTestId } = await renderTable({
			query: async (ctx) => {
				seen.push({ ...ctx.table?.queryParams?.filters });
				return [{ id: "1", title: "Dune" }];
			},
		});
		const input = getByTestId("table-filters-aside").querySelector("input");
		if (!input) {
			throw new Error("panel has no input");
		}
		const user = userEvent.setup({ delay: null });
		await act(async () => {
			await user.type(input, "arrakis");
		});
		await waitFor(() => expect(seen.some((f) => f.q === "arrakis")).toBe(true), {
			timeout: 1000,
		});
	});

	test("below lg the panel is not mounted, the sheet trigger stands in", async () => {
		const original = window.matchMedia;
		window.matchMedia = ((query: string) => ({
			...original(query),
			matches: false,
			addEventListener: () => {},
			removeEventListener: () => {},
		})) as typeof window.matchMedia;
		try {
			const { queryByTestId, getByTestId } = await renderTable();
			await waitFor(() => expect(queryByTestId("table-filters-aside")).toBeNull());
			expect(getByTestId("table-filters-trigger")).toBeTruthy();
		} finally {
			window.matchMedia = original;
		}
	});
});
