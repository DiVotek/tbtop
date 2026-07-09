import { afterEach, beforeEach, describe, expect, jest, test } from "bun:test";
import { act, render } from "@testing-library/react";
import { clearBlockRegistry } from "../../render/blockRegistry";
import { ensureBuiltinsRegistered } from "../../render/registerBuiltins";
import { renderNode } from "../../render/structureRenderer";
import { wrapForStructure } from "../../structure/testFixtures";
import type { StructureNode } from "../../structure/types";

beforeEach(() => {
	clearBlockRegistry();
	ensureBuiltinsRegistered();
	jest.useFakeTimers();
});

afterEach(() => {
	jest.useRealTimers();
	clearBlockRegistry();
});

function statNode(options: Record<string, unknown>): StructureNode {
	return { kind: "stat", options: { label: "Users", value: "1", ...options }, meta: {} };
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

describe("stat polling", () => {
	test("without poll the stat renders statically and never fetches", async () => {
		let calls = 0;
		const query = async () => {
			calls++;
			return { value: "2" };
		};
		const Wrap = wrapForStructure(() => new Response("{}"));
		const { getByText } = render(<Wrap>{renderNode(statNode({ query }))}</Wrap>);
		await advance(60_000);
		expect(getByText("1")).toBeTruthy();
		expect(calls).toBe(0);
	});

	test("polled stat refetches on the interval and updates the card", async () => {
		let calls = 0;
		const query = async () => {
			calls++;
			return { value: `v${calls}`, description: "refreshed" };
		};
		const Wrap = wrapForStructure(() => new Response("{}"));
		const { getByText } = render(
			<Wrap>{renderNode(statNode({ poll: 10, source: "Users", query }))}</Wrap>,
		);
		await flush();
		// Initial render shows the serialized value — no eager fetch.
		expect(getByText("1")).toBeTruthy();
		expect(calls).toBe(0);

		await advance(10_000);
		expect(calls).toBe(1);
		expect(getByText("v1")).toBeTruthy();
		expect(getByText("refreshed")).toBeTruthy();

		await advance(10_000);
		expect(getByText("v2")).toBeTruthy();
	});

	test("poll interval below 5s is clamped to 5s", async () => {
		let calls = 0;
		const query = async () => {
			calls++;
			return { value: "2" };
		};
		const Wrap = wrapForStructure(() => new Response("{}"));
		render(<Wrap>{renderNode(statNode({ poll: 1, source: "Users", query }))}</Wrap>);
		await advance(4_999);
		expect(calls).toBe(0);
		await advance(1);
		expect(calls).toBe(1);
	});

	test("unmount stops polling", async () => {
		let calls = 0;
		const query = async () => {
			calls++;
			return { value: "2" };
		};
		const Wrap = wrapForStructure(() => new Response("{}"));
		const { unmount } = render(
			<Wrap>{renderNode(statNode({ poll: 10, source: "Users", query }))}</Wrap>,
		);
		await advance(10_000);
		expect(calls).toBe(1);

		unmount();
		await advance(30_000);
		expect(calls).toBe(1);
	});

	test("a failed poll keeps the last shown value", async () => {
		let calls = 0;
		const query = async () => {
			calls++;
			if (calls > 1) {
				throw new Error("boom");
			}
			return { value: "fresh" };
		};
		const Wrap = wrapForStructure(() => new Response("{}"));
		const { getByText } = render(
			<Wrap>{renderNode(statNode({ poll: 10, source: "Users", query }))}</Wrap>,
		);
		await advance(10_000);
		expect(getByText("fresh")).toBeTruthy();

		await advance(10_000);
		expect(calls).toBe(2);
		expect(getByText("fresh")).toBeTruthy();
	});
});
