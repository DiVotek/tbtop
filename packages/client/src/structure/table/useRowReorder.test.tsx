/**
 * useRowReorder rules:
 * - onDragEnd reorders rows optimistically, then persists the new id order
 * - a rejected persist rolls the row order back to the pre-drag snapshot
 * - server rows (a refetch) replace the local order
 */
import { beforeEach, describe, expect, mock, test } from "bun:test";
import type { DragEndEvent } from "@dnd-kit/core";
import { act, render, waitFor } from "@testing-library/react";

const mockNotify = mock(() => {});
const mockRefresh = mock(() => {});

mock.module("../actionContext", () => ({
	useClientActionContext: () => ({
		client: null,
		user: null,
		params: {},
		navigate: mock(() => {}),
		notify: mockNotify,
		t: (k: string) => k,
	}),
}));

import { useRowReorder } from "./useRowReorder";

type Row = Record<string, unknown>;

interface HarnessProps {
	rows: Row[];
	reorderRows?: (ids: string[]) => Promise<unknown>;
	onReady: (onDragEnd: (e: DragEndEvent) => void) => void;
}

function Harness({ rows, reorderRows, onReady }: HarnessProps) {
	const r = useRowReorder({ rows, enabled: true, onRefresh: mockRefresh, reorderRows });
	onReady(r.onDragEnd);
	return <div data-testid="order">{r.rows.map((row) => String(row.id)).join(",")}</div>;
}

function dragEvent(activeId: string, overId: string): DragEndEvent {
	return { active: { id: activeId }, over: { id: overId } } as unknown as DragEndEvent;
}

const ROWS: Row[] = [{ id: "1" }, { id: "2" }, { id: "3" }];

beforeEach(() => {
	mockNotify.mockClear();
	mockRefresh.mockClear();
});

describe("useRowReorder", () => {
	test("optimistically reorders then persists the new id order", async () => {
		const calls: string[][] = [];
		const reorderRows = mock((ids: string[]) => {
			calls.push(ids);
			return Promise.resolve({});
		});
		let fire: (e: DragEndEvent) => void = () => {};
		const { getByTestId } = render(
			<Harness rows={ROWS} reorderRows={reorderRows} onReady={(f) => (fire = f)} />,
		);

		act(() => fire(dragEvent("1", "3")));

		expect(getByTestId("order").textContent).toBe("2,3,1");
		expect(calls[0]).toEqual(["2", "3", "1"]);
		await waitFor(() => expect(mockRefresh).toHaveBeenCalled());
	});

	test("rolls back the order when persist rejects and notifies", async () => {
		const reorderRows = mock(() => Promise.reject(new Error("boom")));
		let fire: (e: DragEndEvent) => void = () => {};
		const { getByTestId } = render(
			<Harness rows={ROWS} reorderRows={reorderRows} onReady={(f) => (fire = f)} />,
		);

		act(() => fire(dragEvent("1", "3")));
		// Optimistic order applied immediately.
		expect(getByTestId("order").textContent).toBe("2,3,1");

		// After the rejected POST, the order reverts to the snapshot.
		await waitFor(() => expect(getByTestId("order").textContent).toBe("1,2,3"));
		expect(mockNotify).toHaveBeenCalledTimes(1);
		expect(mockRefresh).not.toHaveBeenCalled();
	});

	test("ignores a drag with no over target", () => {
		const reorderRows = mock(() => Promise.resolve({}));
		let fire: (e: DragEndEvent) => void = () => {};
		const { getByTestId } = render(
			<Harness rows={ROWS} reorderRows={reorderRows} onReady={(f) => (fire = f)} />,
		);

		act(() => fire({ active: { id: "1" }, over: null } as unknown as DragEndEvent));

		expect(getByTestId("order").textContent).toBe("1,2,3");
		expect(reorderRows).not.toHaveBeenCalled();
	});
});
