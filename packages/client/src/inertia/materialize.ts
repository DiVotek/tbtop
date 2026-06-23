import { unwrapData } from "../data/envelope";
import type { ClientActionContext, NodeMeta, StructureNode } from "../structure/types";
import { type ConditionAst, compileCondition } from "./conditionCompiler";
import { compileConstraints } from "./constraints";
import { materializeActionOptions } from "./materializeActions";
import {
	collectConstraints,
	materializeChart,
	materializeRelation,
	materializeUpload,
	tableQueryParams,
} from "./materializeHelpers";

type Bag = Record<string, unknown>;

export interface MaterializeInput {
	basePath: string;
	data: Record<string, Bag>;
}

interface WalkCtx extends MaterializeInput {
	formName?: string;
	formNode?: StructureNode;
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
	const meta = compileMeta(node.meta);
	if (node.kind === "action") {
		return { ...node, meta, options: actionOptions(node, ctx) };
	}
	if (node.kind === "form") {
		return materializeForm({ ...node, meta }, ctx);
	}
	if (node.kind === "table") {
		return materializeTable({ ...node, meta }, ctx);
	}
	if (node.kind.startsWith("chart:")) {
		return materializeChart({ ...node, meta }, ctx.basePath);
	}
	if (node.kind === "select" && node.name) {
		return materializeSelect({ ...node, meta }, ctx);
	}
	const named = materializeNamedField(node, meta, ctx.basePath);
	if (named) {
		return named;
	}
	return { ...node, meta, options: walkChildren(node.options as Bag, ctx) };
}

// basePath-bound named fields (relation, upload); null when this node is neither.
function materializeNamedField(
	node: StructureNode,
	meta: NodeMeta,
	basePath: string,
): StructureNode | null {
	if (!node.name) {
		return null;
	}
	if (node.kind === "relation") {
		return materializeRelation({ ...node, meta }, basePath);
	}
	if (node.kind === "upload") {
		return materializeUpload({ ...node, meta }, basePath);
	}
	return null;
}

/**
 * Compiles wire-format hiddenIf / disabledIf ASTs into ConditionFn.
 * Leaves all other meta keys intact.
 */
function compileMeta(raw: NodeMeta): NodeMeta {
	const meta = { ...raw } as NodeMeta & Record<string, unknown>;
	const rawHiddenIf = (raw as Record<string, unknown>).hiddenIf;
	const rawDisabledIf = (raw as Record<string, unknown>).disabledIf;
	if (rawHiddenIf !== undefined && typeof rawHiddenIf !== "function") {
		meta.hidden = compileCondition(rawHiddenIf as ConditionAst);
	}
	if (rawDisabledIf !== undefined && typeof rawDisabledIf !== "function") {
		meta.disabled = compileCondition(rawDisabledIf as ConditionAst);
	}
	return meta;
}

function actionOptions(node: StructureNode, ctx: WalkCtx): Bag {
	return materializeActionOptions(node, {
		basePath: ctx.basePath,
		formName: ctx.formName,
		formNode: ctx.formNode,
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
	// Walk repeater sub-field nodes so their meta (hiddenIf/disabledIf) is compiled.
	if (Array.isArray(next.fields)) {
		next.fields = next.fields.map((f) => walk(f as StructureNode, ctx));
	}
	// Walk table filter field nodes so their meta (hiddenIf/disabledIf) is compiled.
	if (Array.isArray(next.filters)) {
		next.filters = next.filters.map((f) => walk(f as StructureNode, ctx));
	}
	// Walk select create mini-form fields so hiddenIf/disabledIf is compiled.
	if (next.create !== null && typeof next.create === "object") {
		const create = next.create as Bag;
		if (Array.isArray(create.fields)) {
			next.create = {
				...create,
				fields: create.fields.map((f) => walk(f as StructureNode, ctx)),
			};
		}
	}
	return next;
}

function materializeForm(node: StructureNode, ctx: WalkCtx): StructureNode {
	const name = node.name ?? "";
	const formCtx: WalkCtx = { ...ctx, formName: name, formNode: node };
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

function materializeTable(node: StructureNode, ctx: WalkCtx): StructureNode {
	const opts = node.options as Bag;
	const name = node.name ?? "";
	const compiledFilters = Array.isArray(opts.filters)
		? (opts.filters as StructureNode[]).map((f) => walk(f, ctx))
		: undefined;
	return {
		...node,
		options: {
			...opts,
			// Expose name so TableBlock can namespace its URL-persisted query state.
			name,
			rowActions: actionBags(opts.rowActions, ctx),
			bulkActions: actionBags(opts.bulkActions, ctx),
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

function actionBags(raw: unknown, ctx: WalkCtx): Bag[] {
	if (!Array.isArray(raw)) {
		return [];
	}
	// Route through walk() so each action's meta (compiled hidden/disabled
	// ConditionFns) rides onto the config; actionOptions alone drops it.
	return (raw as StructureNode[]).map((n) => {
		const m = walk(n, ctx);
		return { ...(m.options as Bag), meta: m.meta };
	});
}

function materializeSelect(node: StructureNode, ctx: WalkCtx): StructureNode {
	const opts = walkChildren(node.options as Bag, ctx);
	const create = opts.create as Bag | undefined;
	if (!create) {
		return { ...node, options: opts };
	}
	const fieldName = node.name as string;
	return {
		...node,
		options: {
			...opts,
			create: {
				...create,
				post: (actionCtx: ClientActionContext, data: Record<string, unknown>) =>
					actionCtx.client
						.post(`${ctx.basePath}/select-create/${fieldName}`, data)
						.then((r) => r as { value: string; label: string }),
			},
		},
	};
}
