import type { QueryParams } from "../data/client";
import { unwrapData } from "../data/envelope";
import type { ClientActionContext, StructureNode } from "../structure/types";
import { compileConstraints, type FieldConstraints } from "./constraints";
import { materializeActionOptions } from "./materializeActions";

type Bag = Record<string, unknown>;

export interface MaterializeInput {
	basePath: string;
	data: Record<string, Bag>;
}

interface WalkCtx extends MaterializeInput {
	formName?: string;
}

/**
 * Turns the server-authored JSON structure into the node shapes the
 * ported render blocks expect: query/handler functions are generated
 * against the page-scoped endpoints, never sent over the wire.
 */
export function materialize(root: StructureNode, input: MaterializeInput): StructureNode {
	return walk(root, { ...input });
}

function walk(node: StructureNode, ctx: WalkCtx): StructureNode {
	if (node.kind === "action") {
		return { ...node, options: actionOptions(node, ctx) };
	}
	if (node.kind === "form") {
		return materializeForm(node, ctx);
	}
	if (node.kind === "table") {
		return materializeTable(node, ctx);
	}
	if (node.kind.startsWith("chart:")) {
		return materializeChart(node, ctx);
	}
	return { ...node, options: walkChildren(node.options as Bag, ctx) };
}

function actionOptions(node: StructureNode, ctx: WalkCtx): Bag {
	return materializeActionOptions(node, {
		basePath: ctx.basePath,
		formName: ctx.formName,
		materializeNode: (child) => walk(child, ctx),
	});
}

function walkChildren(options: Bag, ctx: WalkCtx): Bag {
	const next = { ...options };
	if (Array.isArray(next.children)) {
		next.children = next.children.map((c) => walk(c as StructureNode, ctx));
	}
	if (Array.isArray(next.tabs)) {
		next.tabs = next.tabs.map((tab) => {
			const t = tab as { label: string; body: StructureNode };
			return { ...t, body: walk(t.body, ctx) };
		});
	}
	return next;
}

function materializeForm(node: StructureNode, ctx: WalkCtx): StructureNode {
	const name = node.name ?? "";
	const formCtx: WalkCtx = { ...ctx, formName: name };
	const options = walkChildren(node.options as Bag, formCtx);
	const record = ctx.data[name] ?? {};
	const constraints = collectConstraints(node, {});
	return {
		...node,
		options: {
			...options,
			query: () => Promise.resolve(record),
			schema: compileConstraints(constraints),
		},
	};
}

function collectConstraints(
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

function childNodes(opts: Bag): StructureNode[] {
	const children = Array.isArray(opts.children) ? opts.children : [];
	return children as StructureNode[];
}

function materializeTable(node: StructureNode, ctx: WalkCtx): StructureNode {
	const opts = node.options as Bag;
	const name = node.name ?? "";
	return {
		...node,
		options: {
			...opts,
			rowActions: actionBags(opts.rowActions, ctx),
			bulkActions: actionBags(opts.bulkActions, ctx),
			query: (actionCtx: ClientActionContext) =>
				actionCtx.client
					.get(`${ctx.basePath}/tables/${name}`, tableQueryParams(actionCtx))
					.then(unwrapData),
		},
	};
}

function actionBags(raw: unknown, ctx: WalkCtx): Bag[] {
	if (!Array.isArray(raw)) {
		return [];
	}
	return (raw as StructureNode[]).map((n) => actionOptions(n, ctx));
}

function tableQueryParams(ctx: ClientActionContext): QueryParams {
	const params = ctx.table?.queryParams ?? {};
	const [sort, dir] = (params.sort ?? "").split(":");
	const query: QueryParams = {
		page: params.page,
		perPage: params.perPage,
		sort: sort || undefined,
		dir: dir || undefined,
	};
	for (const [field, value] of Object.entries(params.filters ?? {})) {
		query[`filters[${field}]`] = value as QueryParams[string];
	}
	return query;
}

function materializeChart(node: StructureNode, ctx: WalkCtx): StructureNode {
	const opts = node.options as Bag;
	const source = opts.source as string | undefined;
	if (!source) {
		return node;
	}
	return {
		...node,
		options: {
			...opts,
			query: (actionCtx: ClientActionContext) =>
				actionCtx.client.get(`${ctx.basePath}/data/${source}`).then(unwrapData),
		},
	};
}
