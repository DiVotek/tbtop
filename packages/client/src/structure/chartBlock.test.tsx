import { describe, expect, test } from "bun:test";
import { render } from "@testing-library/react";
import { renderNode } from "../render/structureRenderer";
import type { ChartPoint, ChartType } from "./chartBlock";
import { s } from "./structure";
import { wrapForStructure as wrap } from "./testFixtures";

const series = [{ dataKey: "count", label: "Posts" }];

describe("Chart integration", () => {
	test("Chart loaded state renders the chart container", async () => {
		const node = s.chart({
			type: "line",
			query: async () => [{ day: "mon", count: 3 }],
			xKey: "day",
			series,
		});
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);
		expect(await findByTestId("chart-block")).toBeTruthy();
	});

	test("Chart skeleton renders while query is pending", () => {
		const node = s.chart({
			type: "bar",
			query: () => new Promise<ChartPoint[]>(() => {}),
			xKey: "day",
			series,
		});
		const Wrap = wrap(() => new Response("{}"));
		const { getByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);
		expect(getByTestId("chart-skeleton")).toBeTruthy();
	});

	test("Chart error component renders when query rejects", async () => {
		const node = s.chart({
			type: "area",
			query: async () => Promise.reject(new Error("aggregate failed")),
			xKey: "day",
			series,
		});
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);
		const err = await findByTestId("chart-error");
		expect(err.textContent).toBe("aggregate failed");
	});

	test("Chart custom loading override renders instead of default skeleton", () => {
		const Custom = () => <div data-testid="custom-chart-loading">…</div>;
		const node = s.chart({
			type: "line",
			query: () => new Promise<ChartPoint[]>(() => {}),
			xKey: "day",
			series,
			loading: <Custom />,
		});
		const Wrap = wrap(() => new Response("{}"));
		const { getByTestId, queryByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);
		expect(getByTestId("custom-chart-loading")).toBeTruthy();
		expect(queryByTestId("chart-skeleton")).toBeNull();
	});

	test("Chart refetches when params change between renders", async () => {
		let calls = 0;
		const query = async () => {
			calls += 1;
			return [{ day: "mon", count: calls }];
		};
		const Wrap = wrap(() => new Response("{}"));
		const first = s.chart({ type: "line", query, xKey: "day", series, params: ["week"] });
		const { rerender, findByTestId } = render(<Wrap>{renderNode(first)}</Wrap>);
		await findByTestId("chart-block");
		expect(calls).toBe(1);

		const second = s.chart({ type: "line", query, xKey: "day", series, params: ["month"] });
		rerender(<Wrap>{renderNode(second)}</Wrap>);
		await findByTestId("chart-block");
		expect(calls).toBe(2);
	});

	// -------------------------------------------------------------------------
	// Legend containment: chart param controls used to render INSIDE the
	// fixed-height canvas, stealing their own height (~44px) from
	// ResponsiveContainer and pushing the chart + legend past the card bottom
	// (the reported "Submissions" label spilling outside the block). Params
	// must render as a sibling ABOVE the canvas; the canvas keeps its fixed
	// height so the chart gets the full drawing area. jsdom can't measure px,
	// so the tests assert structure, not geometry.
	// -------------------------------------------------------------------------

	const paramNode = {
		kind: "select",
		name: "period",
		options: {
			options: [
				{ value: "week", label: "Week" },
				{ value: "month", label: "Month" },
			],
			default: "week",
		},
		meta: {},
	};

	const chartTypes: ChartType[] = ["area", "line", "bar", "pie", "donut"];

	for (const type of chartTypes) {
		test(`Chart ${type} params render outside the fixed-height canvas`, async () => {
			const node = s.chart({
				type,
				query: async () => [{ day: "mon", count: 3 }],
				xKey: "day",
				nameKey: "day",
				series,
				params: [paramNode],
			});
			const Wrap = wrap(() => new Response("{}"));
			const { findByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);
			const canvas = await findByTestId("chart-canvas");
			const params = await findByTestId("chart-params");
			expect(canvas.contains(params)).toBe(false);
			expect(canvas.style.height).toBe("300px");
		});
	}

	test("Chart without params renders no params container and keeps the fixed-height canvas", async () => {
		const node = s.chart({
			type: "area",
			query: async () => [{ day: "mon", count: 3 }],
			xKey: "day",
			series,
		});
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId, queryByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);
		const canvas = await findByTestId("chart-canvas");
		expect(queryByTestId("chart-params")).toBeNull();
		expect(canvas.style.height).toBe("300px");
	});

	test("Chart custom height is applied to the canvas, not diluted by params", async () => {
		const node = s.chart({
			type: "line",
			query: async () => [{ day: "mon", count: 3 }],
			xKey: "day",
			series,
			height: 240,
			params: [paramNode],
		});
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);
		const canvas = await findByTestId("chart-canvas");
		expect(canvas.style.height).toBe("240px");
		expect(canvas.contains(await findByTestId("chart-params"))).toBe(false);
	});
});
