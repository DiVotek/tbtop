import { collectRules, type Field, materialize } from "../../dsl";
import { notFound } from "../http";
import { arg, type Endpoint, type EndpointCtx } from "./types";
import { validated } from "./validateWith";

/** GET data/{name}: a chart's query() with its declared params, or a stat's. */
const data: Endpoint = {
	method: "GET",
	pattern: ["data", ":name"],
	async run(ctx) {
		const name = arg(ctx, 0);
		const chart = ctx.resolved.s.reachableChart(name);
		const chartQuery = chart?.queryClosure();
		if (chart !== null && chartQuery !== undefined) {
			return { data: await chartQuery(ctx.request, await params(ctx, chart.paramFields())) };
		}
		const stat = ctx.resolved.s.reachableStat(name);
		const statQuery = stat?.queryClosure();
		if (chart === null && stat !== null && statQuery !== undefined) {
			return {
				data: await materialize(await statQuery(await params(ctx, stat.paramFields()))),
			};
		}
		throw notFound(`Data source "${name}" is not defined on this page.`);
	},
};

/**
 * The param bag (DataController::resolveParams): only declared names, the
 * query-string value or the field default (also for an empty value), held to
 * each field's rules() and to one value, so a failing one answers 422 before
 * the query runs.
 */
async function params(ctx: EndpointCtx, fields: Field[]): Promise<Record<string, unknown>> {
	const query = new URL(ctx.request.url).searchParams;
	const bag: Record<string, unknown> = {};
	for (const field of fields) {
		const values = query.getAll(field.name);
		const listed = query.getAll(`${field.name}[]`);
		const value = listed.length > 0 || values.length > 1 ? [...values, ...listed] : values[0];
		bag[field.name] =
			value === undefined || value === "" ? (field.defaultValue() ?? null) : value;
	}
	const rules = collectRules(fields);
	for (const name of Object.keys(bag)) {
		rules[name] = [...(rules[name] ?? []), "tbtop_param_scalar"];
	}
	return validated(bag, rules, {
		hostRules: { ...ctx.options.hostRules, tbtop_param_scalar: SCALAR },
	});
}

/** A param control sends one string; `?period[]=x` or a repeated key is not a param value. */
const SCALAR = {
	check: (value: unknown, _params: string[], key: string) =>
		!Array.isArray(value) || `The ${key} param must be a single value.`,
	message: "",
};

export const DATA_ENDPOINTS = [data];
