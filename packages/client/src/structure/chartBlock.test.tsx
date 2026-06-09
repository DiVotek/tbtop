import { describe, expect, test } from "bun:test";
import { render } from "@testing-library/react";
import { renderNode } from "../render/structureRenderer";
import type { ChartPoint } from "./chartBlock";
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
});
