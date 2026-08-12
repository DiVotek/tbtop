import type { DisabledRange } from "../fields/daterangeDisabled";
import type { ClientActionContext, StructureNode } from "../structure/types";

type Bag = Record<string, unknown>;

/**
 * Binds a dependent daterange to its ranges endpoint. Without dependsOn the
 * serialized disabledRanges are final — no query is injected, so the client
 * can never call the endpoint (the degenerate static case).
 */
export function materializeDaterange(node: StructureNode, basePath: string): StructureNode {
	const opts = node.options as Bag;
	const dependsOn = Array.isArray(opts.dependsOn) ? opts.dependsOn : [];
	if (!node.name || dependsOn.length === 0) {
		return node;
	}
	const endpoint = `${basePath}/daterange-ranges/${node.name}`;
	return {
		...node,
		options: {
			...opts,
			queryRanges: (actionCtx: ClientActionContext, deps: Record<string, string>) =>
				actionCtx.client.post(endpoint, { deps }).then(readRanges),
		},
	};
}

function readRanges(response: unknown): DisabledRange[] {
	if (response === null || typeof response !== "object" || !("ranges" in response)) {
		throw new Error("malformed daterange-ranges response");
	}
	const { ranges } = response;
	return Array.isArray(ranges) ? ranges.map(readRange) : [];
}

function readRange(raw: unknown): DisabledRange {
	if (raw === null || typeof raw !== "object") {
		throw new Error("malformed disabled range");
	}
	const bag = raw as Record<string, unknown>;
	return {
		from: typeof bag.from === "string" ? bag.from : null,
		to: typeof bag.to === "string" ? bag.to : null,
	};
}
