import type { ClientActionContext, StructureNode } from "../structure/types";

type Bag = Record<string, unknown>;

interface LiveRegionCtx {
	basePath: string;
	walk: (node: StructureNode) => StructureNode;
}

/**
 * Binds a liveRegion node to its page-scoped reload endpoint. The render
 * closure never crosses the wire — only dependsOn + initialDeps + initial do;
 * the injected query re-runs it server-side with the current deps.
 *
 * Region content (initial and fetched) goes through the same walk as page
 * nodes: actions inside it need their handlers bound and conditions compiled,
 * exactly like anywhere else in the tree.
 */
export function materializeLiveRegion(node: StructureNode, ctx: LiveRegionCtx): StructureNode {
	if (!node.name) {
		return node;
	}
	const opts = node.options as Bag;
	const endpoint = `${ctx.basePath}/live-region/${node.name}`;
	const initial = Array.isArray(opts.initial)
		? (opts.initial as StructureNode[]).map(ctx.walk)
		: opts.initial;
	return {
		...node,
		options: {
			...opts,
			initial,
			query: (actionCtx: ClientActionContext, deps: Record<string, string>) =>
				actionCtx.client
					.post(endpoint, { deps })
					.then(readLiveNodes)
					.then((nodes) => nodes.map(ctx.walk)),
		},
	};
}

function readLiveNodes(response: unknown): StructureNode[] {
	if (response === null || typeof response !== "object" || !("nodes" in response)) {
		throw new Error("malformed live-region response");
	}
	const { nodes } = response;
	return Array.isArray(nodes) ? (nodes as StructureNode[]) : [];
}
