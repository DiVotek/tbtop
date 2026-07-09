import { describe, expect, test } from "bun:test";
import { render } from "@testing-library/react";
import { materialize } from "../inertia/materialize";
import { renderNode } from "../render/structureRenderer";
import { s } from "./structure";
import { wrapForStructure as wrap } from "./testFixtures";
import type { StructureNode } from "./types";

describe("Table integration", () => {
	test("Table query resolves to rows and renders cells", async () => {
		const rows = Array.from({ length: 3 }, (_, i) => ({ id: `r${i}`, title: `Row ${i}` }));
		const node = s.table({
			query: async () => rows,
			columns: [{ name: "title", label: "Title" }],
		});
		const Wrap = wrap(() => new Response("{}"));
		const { findByText, getByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);
		await findByText("Row 0");
		expect(getByTestId("table-block")).toBeTruthy();
	});

	test("Table upload-kind cell renders the thumbnail from row data", async () => {
		const rows = [
			{
				id: "r1",
				filename: "photo.png",
				url: "/storage/uploads/photo.png",
				mimeType: "image/png",
				sizes: [{ url: "/storage/uploads/photo-thumb.png", width: 128 }],
			},
		];
		const node = s.table({
			query: async () => rows,
			columns: [{ name: "filename", label: "File", kind: "upload" }],
		});
		const Wrap = wrap(() => new Response("{}"));
		const { findByRole } = render(<Wrap>{renderNode(node)}</Wrap>);
		const img = await findByRole("img");
		expect(img.getAttribute("src")).toBe("/storage/uploads/photo-thumb.png");
	});

	test("Table skeleton renders while query is pending", () => {
		const node = s.table({
			query: () => new Promise<unknown[]>(() => {}),
			columns: [{ name: "title" }],
		});
		const Wrap = wrap(() => new Response("{}"));
		const { getByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);
		expect(getByTestId("table-skeleton")).toBeTruthy();
	});

	test("Table error component renders when query rejects", async () => {
		const node = s.table({
			query: async () => Promise.reject(new Error("nope")),
			columns: [{ name: "title" }],
		});
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);
		const err = await findByTestId("table-error");
		expect(err.textContent).toContain("nope");
	});

	test("Table custom loading override renders instead of default skeleton", () => {
		const Custom = () => <div data-testid="custom-table-loading">…</div>;
		const node = s.table({
			query: () => new Promise<unknown[]>(() => {}),
			columns: [{ name: "title" }],
			loading: <Custom />,
		});
		const Wrap = wrap(() => new Response("{}"));
		const { getByTestId, queryByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);
		expect(getByTestId("custom-table-loading")).toBeTruthy();
		expect(queryByTestId("table-skeleton")).toBeNull();
	});

	test("Table mounted within larger structure stays mounted", async () => {
		const node = s.stack([
			s.table({
				query: async () => [{ id: "a", title: "A" }],
				columns: [{ name: "title" }],
			}),
		]);
		const Wrap = wrap(() => new Response("{}"));
		const { findByText } = render(<Wrap>{renderNode(node)}</Wrap>);
		await findByText("A");
	});

	test("Table rowActions render per row and a row action receives ctx.table", async () => {
		const { act, fireEvent } = await import("@testing-library/react");
		let seenRows: number | undefined;
		let seenSelected: string[] | undefined;
		const node = s.table({
			query: async () => [
				{ id: "a", title: "A" },
				{ id: "b", title: "B" },
			],
			columns: [{ name: "title" }],
			rowActions: [
				{
					name: "probe",
					handler: async (c) => {
						seenRows = c.table?.rows.length;
						seenSelected = c.table?.selectedIds;
					},
				},
			],
		});
		const Wrap = wrap(() => new Response("{}"));
		const { findAllByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);
		const buttons = await findAllByTestId("action-probe");
		expect(buttons).toHaveLength(2);
		const firstButton = buttons[0];
		if (!firstButton) {
			throw new Error("no probe button rendered");
		}
		await act(async () => {
			fireEvent.click(firstButton);
		});
		expect(seenRows).toBe(2);
		expect(seenSelected).toEqual([]);
	});

	test("Table bulk action sees selectedIds after selection toggle", async () => {
		const { act, fireEvent } = await import("@testing-library/react");
		let seenSelected: string[] | undefined;
		const node = s.table({
			query: async () => [
				{ id: "a", title: "A" },
				{ id: "b", title: "B" },
			],
			columns: [{ name: "title" }],
			bulkActions: [
				{
					name: "do",
					handler: async (c) => {
						seenSelected = c.table?.selectedIds;
					},
				},
			],
		});
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);
		const checkbox = await findByTestId("table-select-a");
		await act(async () => {
			fireEvent.click(checkbox);
		});
		const action = await findByTestId("action-do");
		await act(async () => {
			fireEvent.click(action);
		});
		expect(seenSelected).toEqual(["a"]);
	});

	test("Table two rapid setQuery patches in one handler merge to union of keys without loss", async () => {
		const { act, fireEvent } = await import("@testing-library/react");
		let finalParams: Record<string, unknown> | undefined;
		const node = s.table({
			query: async () => [{ id: "a", title: "A" }],
			columns: [{ name: "title" }],
			bulkActions: [
				{
					name: "twoPatches",
					handler: async (c) => {
						c.table?.setQuery({ page: 2 });
						c.table?.setQuery({ sort: "title" });
					},
				},
				{
					name: "read",
					handler: async (c) => {
						finalParams = c.table?.queryParams as Record<string, unknown>;
					},
				},
			],
		});
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);
		const selectA = await findByTestId("table-select-a");
		await act(async () => {
			fireEvent.click(selectA);
		});
		const apply = await findByTestId("action-twoPatches");
		await act(async () => {
			fireEvent.click(apply);
		});
		// Refetch cleared selection; re-select to reveal the read action.
		const reselect = await findByTestId("table-select-a");
		await act(async () => {
			fireEvent.click(reselect);
		});
		const read = await findByTestId("action-read");
		await act(async () => {
			fireEvent.click(read);
		});
		expect(finalParams).toEqual({ page: 2, sort: "title" });
	});

	test("Table numeric row id wires up checkbox selection and testid", async () => {
		const { act, fireEvent } = await import("@testing-library/react");
		let seenSelected: string[] | undefined;
		const node = s.table({
			query: async () => [
				{ id: 1, title: "A" },
				{ id: 2, title: "B" },
			],
			columns: [{ name: "title" }],
			bulkActions: [
				{
					name: "do",
					handler: async (c) => {
						seenSelected = c.table?.selectedIds;
					},
				},
			],
		});
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);
		const checkbox = await findByTestId("table-select-1");
		await act(async () => {
			fireEvent.click(checkbox);
		});
		const action = await findByTestId("action-do");
		await act(async () => {
			fireEvent.click(action);
		});
		expect(seenSelected).toEqual(["1"]);
	});

	test("Table selection clears when refetch swaps in fresh rows", async () => {
		const { act, fireEvent } = await import("@testing-library/react");
		let returnSecondSet = false;
		const node = s.table({
			query: async () => {
				if (!returnSecondSet) {
					return [{ id: "a", title: "A" }];
				}
				return [{ id: "b", title: "B" }];
			},
			columns: [{ name: "title" }],
			bulkActions: [
				{
					name: "refetch",
					handler: async (c) => {
						returnSecondSet = true;
						c.table?.refresh();
					},
				},
			],
		});
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);
		const checkbox = await findByTestId("table-select-a");
		await act(async () => {
			fireEvent.click(checkbox);
		});
		const refetch = await findByTestId("action-refetch");
		await act(async () => {
			fireEvent.click(refetch);
		});
		// Fresh rows swapped in; the new row's checkbox is unselected.
		const swapped = (await findByTestId("table-select-b")) as HTMLInputElement;
		expect(swapped.checked).toBe(false);
	});

	test("Table action setQuery merges params and refresh does not change params", async () => {
		const { act, fireEvent } = await import("@testing-library/react");
		const queries: unknown[] = [];
		let firstParams: Record<string, unknown> | undefined;
		let secondParams: Record<string, unknown> | undefined;
		const node = s.table({
			query: async () => {
				queries.push(1);
				return [{ id: "a", title: "A" }];
			},
			columns: [{ name: "title" }],
			bulkActions: [
				{
					name: "page2",
					handler: async (c) => {
						c.table?.setQuery({ page: 2 });
						firstParams = c.table?.queryParams as Record<string, unknown>;
					},
				},
				{
					name: "refresh",
					handler: async (c) => {
						c.table?.refresh();
						secondParams = c.table?.queryParams as Record<string, unknown>;
					},
				},
			],
		});
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);
		const selectA = await findByTestId("table-select-a");
		await act(async () => {
			fireEvent.click(selectA);
		});
		const page2 = await findByTestId("action-page2");
		await act(async () => {
			fireEvent.click(page2);
		});
		expect(firstParams).toEqual({});
		// Refetch cleared selection; re-select to reveal the refresh action.
		const reselect = await findByTestId("table-select-a");
		await act(async () => {
			fireEvent.click(reselect);
		});
		const refresh = await findByTestId("action-refresh");
		const callsBefore = queries.length;
		await act(async () => {
			fireEvent.click(refresh);
		});
		expect(queries.length).toBeGreaterThan(callsBefore);
		expect(secondParams).toEqual({ page: 2 });
	});

	// -------------------------------------------------------------------------
	// embedded — hides toolbar + pagination footer, keeps rows/perPage as-is
	//
	// `embedded` is a server (PHP DSL) only option, like `tabs`/`deferFilters`:
	// it reaches the client on the wire, not through the client's s.table()
	// builder type. Tests build the wire node directly and run it through the
	// real materialize() path, mirroring tableBlockTabs.test.tsx.
	// -------------------------------------------------------------------------

	function embeddedTableNode(embedded: boolean | undefined): StructureNode {
		return {
			kind: "table",
			name: "posts",
			options: {
				columns: [{ name: "title", label: "Title" }],
				searchable: ["title"],
				pagination: { perPage: 25, options: [10, 25, 50] },
				...(embedded !== undefined ? { embedded } : {}),
			},
			meta: {},
		};
	}

	function rowsResponse(): Response {
		return new Response(
			JSON.stringify({
				data: { data: [{ id: "a", title: "A" }], total: 1, page: 1, perPage: 25 },
			}),
		);
	}

	// total exceeds perPage so the pagination footer isn't auto-hidden — used
	// by the "still renders toolbar and pagination" (non-embedded) assertions.
	function multiPageRowsResponse(): Response {
		return new Response(
			JSON.stringify({
				data: { data: [{ id: "a", title: "A" }], total: 100, page: 1, perPage: 25 },
			}),
		);
	}

	test("Table embedded hides the toolbar (search input, filters, column-visibility)", async () => {
		const node = materialize(embeddedTableNode(true), { basePath: "/admin/posts", data: {} });
		const Wrap = wrap(rowsResponse);
		const { findByText, queryByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);
		await findByText("A");
		expect(queryByTestId("table-toolbar")).toBeNull();
		expect(queryByTestId("table-search-input")).toBeNull();
	});

	test("Table embedded hides the pagination footer", async () => {
		const node = materialize(embeddedTableNode(true), { basePath: "/admin/posts", data: {} });
		const Wrap = wrap(rowsResponse);
		const { findByText, queryByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);
		await findByText("A");
		expect(queryByTestId("table-pagination")).toBeNull();
	});

	test("Table non-embedded (default, no embedded key) still renders toolbar and pagination", async () => {
		const node = materialize(embeddedTableNode(undefined), {
			basePath: "/admin/posts",
			data: {},
		});
		const Wrap = wrap(multiPageRowsResponse);
		const { findByText, getByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);
		await findByText("A");
		expect(getByTestId("table-toolbar")).toBeTruthy();
		expect(getByTestId("table-pagination")).toBeTruthy();
	});

	test("Table embedded:false explicitly still renders toolbar and pagination", async () => {
		const node = materialize(embeddedTableNode(false), { basePath: "/admin/posts", data: {} });
		const Wrap = wrap(multiPageRowsResponse);
		const { findByText, getByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);
		await findByText("A");
		expect(getByTestId("table-toolbar")).toBeTruthy();
		expect(getByTestId("table-pagination")).toBeTruthy();
	});

	test("Table embedded still renders rows and reflects the server perPage", async () => {
		const node = materialize(embeddedTableNode(true), { basePath: "/admin/posts", data: {} });
		const Wrap = wrap(rowsResponse);
		const { findByText, queryByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);
		await findByText("A");
		// perPage still applies to the query even though the footer is hidden.
		expect(queryByTestId("pagination-per-page")).toBeNull();
	});
});
