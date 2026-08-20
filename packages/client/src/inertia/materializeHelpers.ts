import type { QueryParams } from "../data/client";
import { unwrapData } from "../data/envelope";
import type { OptionDisplay, StaticOption } from "../fields/selectShared";
import type { ClientActionContext, ListQueryParams, StructureNode } from "../structure/types";

type Bag = Record<string, unknown>;

// ---------------------------------------------------------------------------
// Async option endpoints (relation-search, select-options)
// ---------------------------------------------------------------------------

type OptionRow = StaticOption;

function toOptionRow(raw: unknown): OptionRow {
	if (raw === null || typeof raw !== "object" || !("value" in raw)) {
		throw new Error("malformed option row");
	}
	const value = String(raw.value);
	const label = "label" in raw && raw.label !== null ? String(raw.label) : value;
	const display = "display" in raw ? toOptionDisplay(raw.display) : undefined;
	return display ? { value, label, display } : { value, label };
}

/** An unusable shape degrades to a plain option rather than throwing. */
function toOptionDisplay(raw: unknown): OptionDisplay | undefined {
	if (raw === null || typeof raw !== "object") {
		return undefined;
	}
	const display: OptionDisplay = {
		image: readString(raw, "image"),
		subtitle: readString(raw, "subtitle"),
		html: readString(raw, "html"),
	};
	const isEmpty = Object.values(display).every((v) => v === undefined);
	return isEmpty ? undefined : display;
}

function readString(raw: object, key: string): string | undefined {
	const value = (raw as Record<string, unknown>)[key];
	return typeof value === "string" ? value : undefined;
}

function readOptions(response: unknown): OptionRow[] {
	if (response === null || typeof response !== "object" || !("options" in response)) {
		throw new Error("malformed options response");
	}
	const { options } = response;
	return Array.isArray(options) ? options.map(toOptionRow) : [];
}

function readOption(response: unknown): OptionRow {
	if (response === null || typeof response !== "object" || !("option" in response)) {
		throw new Error("malformed option response");
	}
	if (response.option === null) {
		throw new Error("not found");
	}
	return toOptionRow(response.option);
}

/** Search half of an async options bag — identical for single and multiple. */
function asyncSearchBag(endpoint: string): Bag {
	return {
		query: (actionCtx: ClientActionContext, search: string, deps?: Record<string, string>) =>
			actionCtx.client.post(endpoint, { search, deps }).then(readOptions),
		optionLabel: (row: unknown) => toOptionRow(row).label,
		optionValue: (row: unknown) => toOptionRow(row).value,
		// Carries display alongside the label. Separate from optionLabel so
		// relation and tags keep their string contract.
		optionRow: (row: unknown) => toOptionRow(row),
	};
}

/**
 * query/onLoad/optionLabel/optionValue bound to an endpoint that answers
 * {search, deps} with {options} and {value, deps} with {option}. Both
 * relation-search and select-options speak exactly this protocol.
 */
function asyncOptionsBag(endpoint: string): Bag {
	return {
		...asyncSearchBag(endpoint),
		onLoad: (actionCtx: ClientActionContext, value: string, deps?: Record<string, string>) =>
			actionCtx.client.post(endpoint, { value, deps }).then(readOption),
	};
}

/**
 * A multiple() select resolves every stored value in one request: onLoad takes
 * the whole id list and gets a list back, which is why the endpoint reads
 * `values` rather than overloading `value` with an array.
 */
function asyncMultiOptionsBag(endpoint: string): Bag {
	return {
		...asyncSearchBag(endpoint),
		onLoad: (actionCtx: ClientActionContext, values: string[], deps?: Record<string, string>) =>
			actionCtx.client.post(endpoint, { values, deps }).then(readOptions),
	};
}

export function materializeRelation(node: StructureNode, basePath: string): StructureNode {
	const opts = node.options as Bag;
	const fieldName = node.name as string;
	return {
		...node,
		options: { ...opts, ...asyncOptionsBag(`${basePath}/relation-search/${fieldName}`) },
	};
}

/**
 * The select-options endpoint exists for every select, but only a field whose
 * PHP builder got a query() closure answers it — so the async bag is injected
 * solely when the server set `async`. The closure itself never crosses the wire.
 */
export function selectOptionsEndpoint(node: StructureNode, basePath: string, opts: Bag): Bag {
	if (opts.async !== true) {
		return opts;
	}
	const endpoint = `${basePath}/select-options/${node.name as string}`;
	const bag = opts.multiple === true ? asyncMultiOptionsBag(endpoint) : asyncOptionsBag(endpoint);
	return { ...opts, ...bag };
}

// ---------------------------------------------------------------------------
// Upload field materialization
// ---------------------------------------------------------------------------

export function materializeUpload(node: StructureNode, basePath: string): StructureNode {
	const opts = node.options as Bag;
	const fieldName = node.name as string;
	const endpoint = `${basePath}/uploads/${fieldName}`;
	return {
		...node,
		options: {
			...opts,
			upload: (actionCtx: ClientActionContext, file: File, signal?: AbortSignal) => {
				const body = new FormData();
				body.append("file", file);
				return actionCtx.client.upload(endpoint, body, { signal });
			},
		},
	};
}

// ---------------------------------------------------------------------------
// Chart materialization
// ---------------------------------------------------------------------------

export function materializeChart(node: StructureNode, basePath: string): StructureNode {
	const opts = node.options as Bag;
	const source = opts.source as string | undefined;
	if (!source) {
		return node;
	}
	return {
		...node,
		options: {
			...opts,
			query: (actionCtx: ClientActionContext, paramValues: Record<string, string> = {}) =>
				actionCtx.client.get(`${basePath}/data/${source}`, paramValues).then(unwrapData),
		},
	};
}

// ---------------------------------------------------------------------------
// Stat materialization (polling stats only — plain stats stay static)
// ---------------------------------------------------------------------------

export function materializeStat(node: StructureNode, basePath: string): StructureNode {
	const opts = node.options as Bag;
	const source = opts.source as string | undefined;
	if (!source) {
		return node;
	}
	// source is the stat's label — encode it, labels are human text.
	const endpoint = `${basePath}/data/${encodeURIComponent(source)}`;
	return {
		...node,
		options: {
			...opts,
			query: (actionCtx: ClientActionContext) =>
				actionCtx.client.get(endpoint).then(unwrapData),
		},
	};
}

// ---------------------------------------------------------------------------
// Table query param encoding
// ---------------------------------------------------------------------------

export function tableQueryParams(ctx: ClientActionContext): QueryParams {
	const params = ctx.table?.queryParams ?? {};
	const query = scalarQueryParams(params);
	for (const [field, value] of Object.entries(params.filters ?? {})) {
		const encoded = encodeFilterValue(field, value);
		for (const [k, v] of Object.entries(encoded)) {
			query[k] = v as QueryParams[string];
		}
	}
	for (const [field, value] of Object.entries(params.colSearch ?? {})) {
		if (value) {
			query[`colSearch[${field}]`] = value;
		}
	}
	return query;
}

function scalarQueryParams(params: ListQueryParams): QueryParams {
	const [sort, dir] = (params.sort ?? "").split(":");
	return {
		page: params.page,
		perPage: params.perPage,
		sort: sort || undefined,
		dir: dir || undefined,
		search: params.search || undefined,
		tab: params.tab || undefined,
	};
}

export function encodeFilterValue(field: string, value: unknown): Record<string, unknown> {
	if (value !== null && typeof value === "object" && !Array.isArray(value)) {
		// daterange: filters[field][from] / filters[field][to]
		const obj = value as Record<string, unknown>;
		const result: Record<string, unknown> = {};
		for (const [k, v] of Object.entries(obj)) {
			result[`filters[${field}][${k}]`] = v;
		}
		return result;
	}
	if (Array.isArray(value)) {
		// tags: repeated params filters[field][]=v
		const result: Record<string, unknown> = {};
		value.forEach((v, i) => {
			result[`filters[${field}][${i}]`] = v;
		});
		return result;
	}
	return { [`filters[${field}]`]: value };
}
