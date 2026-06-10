import type { ConditionContext, NodeMeta } from "./types";

export function isNodeHidden(meta: NodeMeta | undefined, condCtx: ConditionContext): boolean {
	const fn = meta?.hidden;
	return typeof fn === "function" && fn(condCtx) === true;
}

export function isNodeDisabled(meta: NodeMeta | undefined, condCtx: ConditionContext): boolean {
	const fn = meta?.disabled;
	return typeof fn === "function" && fn(condCtx) === true;
}
