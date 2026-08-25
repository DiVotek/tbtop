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

/**
 * True when a field's asterisk should show: a static options.required, or a
 * requiredIf condition (meta.required) that currently evaluates true.
 */
export function isNodeRequired(
	meta: NodeMeta | undefined,
	condCtx: ConditionContext,
	staticRequired: boolean,
): boolean {
	const required = meta?.required;
	if (staticRequired || required === true) {
		return true;
	}
	return typeof required === "function" && required(condCtx) === true;
}
