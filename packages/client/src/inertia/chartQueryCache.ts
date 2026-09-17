import { unwrapData } from "../data/envelope";
import type { ClientActionContext } from "../structure/types";

type ChartParams = Record<string, string>;
type ChartQuery = (actionCtx: ClientActionContext, paramValues?: ChartParams) => Promise<unknown>;

const MAX_CHART_QUERIES = 128;
const chartQueries = new Map<string, ChartQuery>();

export function chartQueryFor(basePath: string, source: string): ChartQuery {
	const endpoint = `${basePath}/data/${source}`;
	const cached = chartQueries.get(endpoint);
	if (cached) {
		chartQueries.delete(endpoint);
		chartQueries.set(endpoint, cached);
		return cached;
	}
	const query: ChartQuery = (actionCtx, paramValues = {}) =>
		actionCtx.client.get(endpoint, paramValues).then(unwrapData);
	chartQueries.set(endpoint, query);
	evictOldestQuery();
	return query;
}

function evictOldestQuery(): void {
	if (chartQueries.size <= MAX_CHART_QUERIES) {
		return;
	}
	const oldest = chartQueries.keys().next();
	if (!oldest.done) {
		chartQueries.delete(oldest.value);
	}
}
