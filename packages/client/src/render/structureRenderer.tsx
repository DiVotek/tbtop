import type { ReactNode } from "react";
import { isNodeHidden } from "../structure/meta";
import type { ConditionContext, StructureNode } from "../structure/structure";
import type { NodeMeta, RenderContext } from "./blockRegistry";
import { ensureBuiltinsRegistered } from "./registerBuiltins";
import { invokeBlock } from "./renderDescriptor";

const DEFAULT_CTX: RenderContext = { surface: "form" };

const EMPTY_CONDITION_CTX: ConditionContext = { record: undefined, data: {}, user: null };

export function renderNode(node: StructureNode, ctx: RenderContext = DEFAULT_CTX): ReactNode {
	ensureBuiltinsRegistered();
	if (isNodeHidden(node.meta, EMPTY_CONDITION_CTX)) {
		return null;
	}
	const view = node as unknown as { children?: StructureNode[] };
	const baseOptions = (node.options as Record<string, unknown> | undefined) ?? {};
	const options = node.name ? { name: node.name, ...baseOptions } : baseOptions;
	const children = view.children ?? (options as { children?: StructureNode[] }).children;
	return invokeBlock({
		kind: node.kind,
		options,
		meta: (node.meta ?? {}) as NodeMeta,
		ctx,
		children,
		renderChild: (child: StructureNode) => renderNode(child, ctx),
	});
}
