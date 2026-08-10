import type { ClientActionContext, StructureNode } from "../structure/types";

type Bag = Record<string, unknown>;

/**
 * Binds a liveRegion node to its page-scoped reload endpoint. The render
 * closure never crosses the wire — only dependsOn + initial do; the injected
 * query re-runs it server-side with the current deps.
 */
export function materializeLiveRegion(node: StructureNode, basePath: string): StructureNode {
	if (!node.name) {
		return node;
	}
	const opts = node.options as Bag;
	const endpoint = `${basePath}/live-region/${node.name}`;
	return {
		...node,
		options: {
			...opts,
			query: (actionCtx: ClientActionContext, deps: Record<string, string>) =>
				actionCtx.client.post(endpoint, { deps }).then(readLiveNodes),
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
