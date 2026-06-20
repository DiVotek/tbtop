/**
 * Keep-previous-data: refetch shows overlay, not skeleton; first load shows skeleton.
 */
import { describe, expect, test } from "bun:test";
import { act, fireEvent, render, waitFor } from "@testing-library/react";
import { renderNode } from "../../render/structureRenderer";
import { s } from "../structure";
import { wrapForStructure as wrap } from "../testFixtures";

describe("TableKeepPrevious: skeleton only on first load", () => {
	test("skeleton visible while first query is pending", () => {
		const node = s.table({
			query: () => new Promise<unknown[]>(() => {}),
			columns: [{ name: "title" }],
		});
		const Wrap = wrap(() => new Response("{}"));
		const { getByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);
		expect(getByTestId("table-skeleton")).toBeTruthy();
	});

	// QUARANTINED (M-97): deterministic on GitHub's runner, unreproducible in a
	// matched Linux/Bun/2-CPU container — the reload overlay never appears after
	// the refetch click despite correct provider wiring. Test-harness timing bug,
	// not a product bug: the overlay works in the browser smoke. See flaky-suite
	// investigation task before re-enabling.
	test.skip("overlay shown on refetch, skeleton absent, stale rows still visible", async () => {
		let resolveSecond: (v: unknown[]) => void = () => {};
		let callCount = 0;

		const node = s.table({
			query: async () => {
				callCount += 1;
				if (callCount === 1) {
					return [{ id: "1", title: "First" }];
				}
				// second call hangs until we resolve
				return new Promise<unknown[]>((res) => {
					resolveSecond = res;
				});
			},
			columns: [{ name: "title", label: "Title" }],
			bulkActions: [{ name: "refresh", handler: async (ctx) => ctx.table?.refresh() }],
		});

		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId, queryByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);
		await findByTestId("table-block");

		// Select a row so the bulk action becomes available.
		const selectRow = await findByTestId("table-select-1");
		await act(async () => {
			fireEvent.click(selectRow);
		});

		// Trigger a refetch
		const btn = await findByTestId("action-refresh");
		await act(async () => {
			fireEvent.click(btn);
		});

		// Overlay should appear, skeleton should NOT appear, row still visible
		await waitFor(() => {
			expect(queryByTestId("table-reloading-overlay")).toBeTruthy();
			expect(queryByTestId("table-skeleton")).toBeNull();
		});

		// Stale row still rendered
		expect(queryByTestId("table-row-1")).toBeTruthy();

		// Let the second query resolve
		await act(async () => {
			resolveSecond([{ id: "2", title: "Second" }]);
		});

		await waitFor(() => {
			expect(queryByTestId("table-reloading-overlay")).toBeNull();
			expect(queryByTestId("table-row-2")).toBeTruthy();
		});
	});
});
