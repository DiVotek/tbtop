import { describe, expect, test } from "bun:test";
import { render } from "@testing-library/react";
import { renderNode } from "../render/structureRenderer";
import { s } from "./structure";
import { wrapForStructure as wrap } from "./testFixtures";

function makeParamNode(name: string, kind: string, options: Record<string, unknown> = {}) {
	return { kind, name, options, meta: {} };
}

const selectParam = makeParamNode("interval", "select", {
	options: [
		{ value: "day", label: "Day" },
		{ value: "month", label: "Month" },
	],
	default: "day",
});

describe("chart param controls", () => {
	test("renders select param control when params contains a select node", async () => {
		const calls: Array<Record<string, string> | undefined> = [];
		const node = s.chart({
			type: "bar",
			query: async (_ctx, params) => {
				calls.push(params);
				return [];
			},
			xKey: "period",
			params: [selectParam],
		});

		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);

		await findByTestId("chart-block");
		expect(calls.length).toBeGreaterThan(0);
	});

	test("initial fetch uses declared default value", async () => {
		const calls: Array<Record<string, string> | undefined> = [];
		const node = s.chart({
			type: "bar",
			query: async (_ctx, params) => {
				calls.push(params);
				return [];
			},
			xKey: "period",
			params: [selectParam],
		});

		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);

		await findByTestId("chart-block");
		expect(calls[0]).toEqual({ interval: "day" });
	});

	test("changing a select control triggers refetch with new param value", async () => {
		const fetchCalls: string[] = [];

		const Wrap = wrap((req: Request) => {
			fetchCalls.push(req.url);
			return new Response(JSON.stringify({ data: [] }));
		});

		const node = s.chart({
			type: "bar",
			query: async (ctx, params) => {
				const url = `/data/byInterval${params && Object.keys(params).length ? "?" + new URLSearchParams(params).toString() : ""}`;
				await ctx.client.get(url);
				return [];
			},
			xKey: "period",
			params: [selectParam],
		});

		const { findByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);
		await findByTestId("chart-block");
		const initialCount = fetchCalls.length;
		expect(initialCount).toBeGreaterThan(0);
		expect(fetchCalls[0]).toContain("interval=day");
	});

	test("zero-param chart renders chart-block without any param controls", async () => {
		const node = s.chart({
			type: "line",
			query: async () => [],
			xKey: "x",
		});

		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId, container } = render(<Wrap>{renderNode(node)}</Wrap>);

		await findByTestId("chart-block");
		const paramWrapper = container.querySelector(".mb-3");
		expect(paramWrapper).toBeNull();
	});
});
