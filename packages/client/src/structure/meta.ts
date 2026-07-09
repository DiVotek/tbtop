import type { ConditionContext, NodeMeta } from "./types";

export function isNodeHidden(meta: NodeMeta | undefined, condCtx: ConditionContext): boolean {
	const hidden = meta?.hidden;
	if (hidden === true) {
		return true;
	}
	return typeof hidden === "function" && hidden(condCtx) === true;
}

export function isNodeDisabled(meta: NodeMeta | undefined, condCtx: ConditionContext): boolean {
	const disabled = meta?.disabled;
	if (disabled === true) {
		return true;
	}
	return typeof disabled === "function" && disabled(condCtx) === true;
}
