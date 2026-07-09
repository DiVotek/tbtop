/**
 * Table node materialization + the shared action-list → ActionConfig bag
 * conversion. Split out of materialize.ts to keep that file under the size
 * cap; takes a `walk` callback instead of importing materialize.ts directly
 * to avoid a circular import (materialize.ts is the one calling in here).
 */
import { unwrapData } from "../data/envelope";
import type { ActionConfig, ClientActionContext, StructureNode } from "../structure/types";
import { tableQueryParams } from "./materializeHelpers";

type Bag = Record<string, unknown>;
type Walk = (node: StructureNode) => StructureNode;

export interface TableMaterializeCtx {
	basePath: string;
	walk: Walk;
}

export function materializeTable(node: StructureNode, ctx: TableMaterializeCtx): StructureNode {
	const opts = node.options as Bag;
	const name = node.name ?? "";
	const compiledFilters = Array.isArray(opts.filters)
		? (opts.filters as StructureNode[]).map((f) => ctx.walk(f))
		: undefined;
	return {
		...node,
		options: {
			...opts,
			// Expose name so TableBlock can namespace its URL-persisted query state.
			name,
			rowActions: actionBags(opts.rowActions, ctx.walk),
			bulkActions: actionBags(opts.bulkActions, ctx.walk),
			headerActions: actionBags(opts.headerActions, ctx.walk),
			...(compiledFilters !== undefined ? { filters: compiledFilters } : {}),
			query: (actionCtx: ClientActionContext) =>
				actionCtx.client
					.get(`${ctx.basePath}/tables/${name}`, tableQueryParams(actionCtx))
					.then(unwrapData),
			saveCell: (
				actionCtx: ClientActionContext,
				args: { column: string; id: string; value: unknown },
			) =>
				actionCtx.client
					.post(`${ctx.basePath}/cells/${name}/${args.column}`, {
						payload: { id: args.id, value: args.value },
					})
					.then((body) => (body as { effects?: unknown }).effects),
			reorderRows: (actionCtx: ClientActionContext, ids: string[]) =>
				actionCtx.client
					.post(`${ctx.basePath}/tables/${name}/reorder`, { ids })
					.then((body) => (body as { effects?: unknown }).effects),
		},
	};
}

/**
 * Materializes a flat list of wire action nodes (e.g. table row/bulk/header
 * actions, or Page::headerActions()) into the ActionConfig bags ActionBlock
 * expects.
 */
export function actionBags(raw: unknown, walk: Walk): ActionConfig[] {
	if (!Array.isArray(raw)) {
		return [];
	}
	// Route through walk() so each action's meta (compiled hidden/disabled
	// ConditionFns) rides onto the config; materializing options alone drops it.
	return (raw as StructureNode[]).map((n) => {
		const m = walk(n);
		if (m.kind === "action") {
			return { ...(m.options as Bag), meta: m.meta } as unknown as ActionConfig;
		}
		return { kind: m.kind, ...(m.options as Bag), meta: m.meta } as unknown as ActionConfig;
	});
}
