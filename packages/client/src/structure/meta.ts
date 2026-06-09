import type { ConditionContext, NodeMeta } from "./types";

export function isNodeHidden(meta: NodeMeta | undefined, condCtx: ConditionContext): boolean {
	const fn = meta?.hidden;
	return typeof fn === "function" && fn(condCtx) === true;
}
