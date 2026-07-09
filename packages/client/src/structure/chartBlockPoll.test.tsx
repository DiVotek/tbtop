import { afterEach, beforeEach, describe, expect, jest, test } from "bun:test";
import { act, render } from "@testing-library/react";
import { clearBlockRegistry } from "../render/blockRegistry";
import { ensureBuiltinsRegistered } from "../render/registerBuiltins";
import { renderNode } from "../render/structureRenderer";
import { wrapForStructure } from "./testFixtures";
import type { StructureNode } from "./types";

beforeEach(() => {
	clearBlockRegistry();
	ensureBuiltinsRegistered();
	jest.useFakeTimers();
});

afterEach(() => {
	jest.useRealTimers();
	clearBlockRegistry();
});

function chartNode(poll: number | undefined, query: () => Promise<unknown>): StructureNode {
	return {
		kind: "chart:line",
		name: "load",
		options: { type: "line", xKey: "x", query, ...(poll !== undefined ? { poll } : {}) },
		meta: {},
	};
}

function countingQuery() {
	const state = { calls: 0 };
	const query = async () => {
		state.calls++;
		return [{ x: 1, y: state.calls }];
	};
	return { state, query };
}

async function flush() {
	await act(async () => {});
}

async function advance(ms: number) {
	await act(async () => {
		jest.advanceTimersByTime(ms);
	});
	await flush();
}

describe("chart polling", () => {
	test("poll refetches the query on each interval tick", async () => {
		const { state, query } = countingQuery();
		const Wrap = wrapForStructure(() => new Response("{}"));
		render(<Wrap>{renderNode(chartNode(10, query))}</Wrap>);
		await flush();
		expect(state.calls).toBe(1);

		await advance(10_000);
		expect(state.calls).toBe(2);
		await advance(10_000);
		expect(state.calls).toBe(3);
	});

	test("poll interval below 5s is clamped to 5s", async () => {
		const { state, query } = countingQuery();
		const Wrap = wrapForStructure(() => new Response("{}"));
		render(<Wrap>{renderNode(chartNode(1, query))}</Wrap>);
		await flush();
		expect(state.calls).toBe(1);

		await advance(4_999);
		expect(state.calls).toBe(1);
		await advance(1);
		expect(state.calls).toBe(2);
	});

	// 12s window: any real poll is clamped to >=5s, so it would fire here.
	// Kept small — recharts animation replays every faked frame, and a
	// 60s advance blew the 5s test timeout on slow CI runners.
	test("no poll option means a single fetch and no timers", async () => {
		const { state, query } = countingQuery();
		const Wrap = wrapForStructure(() => new Response("{}"));
		render(<Wrap>{renderNode(chartNode(undefined, query))}</Wrap>);
		await flush();
		expect(state.calls).toBe(1);

		await advance(12_000);
		expect(state.calls).toBe(1);
	}, 15_000);

	test("unmount stops polling", async () => {
		const { state, query } = countingQuery();
		const Wrap = wrapForStructure(() => new Response("{}"));
		const { unmount } = render(<Wrap>{renderNode(chartNode(10, query))}</Wrap>);
		await flush();
		await advance(10_000);
		expect(state.calls).toBe(2);

		unmount();
		await advance(30_000);
		expect(state.calls).toBe(2);
	});
});
