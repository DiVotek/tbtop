import { materialize } from "../../dsl";
import { notFound } from "../http";
import { arg, type Endpoint } from "./types";

/** GET data/{name}: a chart's query() with its declared params, or a stat's. */
const data: Endpoint = {
	method: "GET",
	pattern: ["data", ":name"],
	async run(ctx) {
		const name = arg(ctx, 0);
		const chart = ctx.resolved.s.reachableChart(name);
		const chartQuery = chart?.queryClosure();
		if (chart !== null && chartQuery !== undefined) {
			const query = new URL(ctx.request.url).searchParams;
			const params = Object.fromEntries(
				chart.paramFields().map((f) => [f.name, query.get(f.name) ?? f.defaultValue()]),
			);
			return { data: await chartQuery(ctx.request, params) };
		}
		const statQuery = ctx.resolved.s.reachableStat(name)?.queryClosure();
		if (chart === null && statQuery !== undefined) {
			return { data: await materialize(await statQuery()) };
		}
		throw notFound(`Data source "${name}" is not defined on this page.`);
	},
};

export const DATA_ENDPOINTS = [data];
