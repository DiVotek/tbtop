/**
 * Table poll(): background refetch on the server's interval — rows stay on
 * screen with no reload overlay, a failed tick keeps them, and a pending
 * selection pauses polling.
 */
import { afterEach, beforeEach, describe, expect, jest, test } from "bun:test";
import { act, fireEvent, render } from "@testing-library/react";
import { renderNode } from "../../render/structureRenderer";
import { s } from "../structure";
import { wrapForStructure as wrap } from "../testFixtures";

beforeEach(() => {
	jest.useFakeTimers();
});

afterEach(() => {
	jest.useRealTimers();
});

type Responder = (call: number) => Promise<unknown[]>;

function pollingTable(poll: number | undefined, respond: Responder) {
	const state = { calls: 0 };
	const node = s.table({
		query: () => respond(++state.calls),
		columns: [{ name: "title", label: "Title" }],
		bulkActions: [{ name: "do", handler: async () => {} }],
		...(poll !== undefined ? { poll } : {}),
	});
	return { state, node };
}

const rowsFor = (call: number) => Promise.resolve([{ id: "a", title: `Row v${call}` }]);

async function flush() {
	await act(async () => {});
}

async function advance(ms: number) {
	await act(async () => {
		jest.advanceTimersByTime(ms);
	});
	await flush();
}

describe("table polling", () => {
	test("each tick refetches and swaps in the new rows", async () => {
		const { state, node } = pollingTable(10, rowsFor);
		const Wrap = wrap(() => new Response("{}"));
		const { findByText } = render(<Wrap>{renderNode(node)}</Wrap>);
		await findByText("Row v1");

		await advance(10_000);
		expect(state.calls).toBe(2);
		expect(await findByText("Row v2")).toBeTruthy();
	});

	test("an in-flight poll shows no reload overlay and keeps the rows", async () => {
		let release: (rows: unknown[]) => void = () => {};
		const { node } = pollingTable(10, (call) =>
			call === 1
				? rowsFor(call)
				: new Promise((resolve) => {
						release = resolve;
					}),
		);
		const Wrap = wrap(() => new Response("{}"));
		const { findByText, getByText, queryByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);
		await findByText("Row v1");

		await advance(10_000);
		expect(queryByTestId("table-reloading-overlay")).toBeNull();
		expect(getByText("Row v1")).toBeTruthy();

		await act(async () => release([{ id: "a", title: "Row v2" }]));
		expect(await findByText("Row v2")).toBeTruthy();
	});

	test("a failed tick keeps the last rows instead of the error state", async () => {
		const { state, node } = pollingTable(10, (call) =>
			call === 2 ? Promise.reject(new Error("offline")) : rowsFor(call),
		);
		const Wrap = wrap(() => new Response("{}"));
		const { findByText, getByText, queryByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);
		await findByText("Row v1");

		await advance(10_000);
		expect(state.calls).toBe(2);
		expect(queryByTestId("table-error")).toBeNull();
		expect(getByText("Row v1")).toBeTruthy();

		await advance(10_000);
		expect(await findByText("Row v3")).toBeTruthy();
	});

	test("a selected row pauses polling until the selection clears", async () => {
		const { state, node } = pollingTable(10, rowsFor);
		const Wrap = wrap(() => new Response("{}"));
		const { findByText, getByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);
		await findByText("Row v1");

		act(() => {
			fireEvent.click(getByTestId("table-select-a"));
		});
		await advance(30_000);
		expect(state.calls).toBe(1);

		act(() => {
			fireEvent.click(getByTestId("table-select-a"));
		});
		await advance(10_000);
		expect(state.calls).toBe(2);
	});

	test("no poll option means a single fetch", async () => {
		const { state, node } = pollingTable(undefined, rowsFor);
		const Wrap = wrap(() => new Response("{}"));
		const { findByText } = render(<Wrap>{renderNode(node)}</Wrap>);
		await findByText("Row v1");

		await advance(30_000);
		expect(state.calls).toBe(1);
	});
});
