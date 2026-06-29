import type { QueryParams } from "../data/client";
import { unwrapData } from "../data/envelope";
import type { ClientActionContext, ListQueryParams, StructureNode } from "../structure/types";
import type { FieldConstraints } from "./constraints";

type Bag = Record<string, unknown>;

// ---------------------------------------------------------------------------
// Relation field materialization
// ---------------------------------------------------------------------------

interface RelationRow {
	value: string;
	label: string;
}

export function materializeRelation(node: StructureNode, basePath: string): StructureNode {
	const opts = node.options as Bag;
	const fieldName = node.name as string;
	const endpoint = `${basePath}/relation-search/${fieldName}`;
	return {
		...node,
		options: {
			...opts,
			query: (
				actionCtx: ClientActionContext,
				search: string,
				deps?: Record<string, string>,
			) =>
				actionCtx.client
					.post(endpoint, { search, deps })
					.then((r) => (r as { options: RelationRow[] }).options),
			onLoad: (
				actionCtx: ClientActionContext,
				value: string,
				deps?: Record<string, string>,
			) =>
				actionCtx.client.post(endpoint, { value, deps }).then((r) => {
					const opt = (r as { option: RelationRow | null }).option;
					if (opt === null) {
						throw new Error("not found");
					}
					return opt;
				}),
			optionLabel: (row: unknown) => (row as RelationRow).label,
			optionValue: (row: unknown) => (row as RelationRow).value,
		},
	};
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
// Constraint collection
// ---------------------------------------------------------------------------

export function collectConstraints(
	node: StructureNode,
	acc: Record<string, FieldConstraints>,
): Record<string, FieldConstraints> {
	const opts = node.options as Bag;
	if (node.name && opts.constraints && node.kind !== "form") {
		acc[node.name] = opts.constraints as FieldConstraints;
	}
	for (const child of childNodes(opts)) {
		collectConstraints(child, acc);
	}
	return acc;
}

export function childNodes(opts: Bag): StructureNode[] {
	const children = Array.isArray(opts.children) ? opts.children : [];
	return children as StructureNode[];
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
