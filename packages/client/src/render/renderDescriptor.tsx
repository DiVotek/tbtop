import { createElement, type ReactNode } from "react";
import type { StructureNode } from "../structure/structure";
import {
	type BlockDescriptor,
	getBlockDescriptor,
	markKindWarned,
	type NodeMeta,
	type RenderContext,
} from "./blockRegistry";
import { UnknownBlock } from "./UnknownBlock";

interface InvokeInput<TOptions> {
	kind: string;
	options: TOptions;
	ctx: RenderContext;
	meta?: NodeMeta;
	children?: StructureNode[];
	renderChild?: (node: StructureNode) => ReactNode;
}

const NO_RENDER_CHILD = () => null;

export function invokeBlock<TOptions>(input: InvokeInput<TOptions>): ReactNode {
	const descriptor = getBlockDescriptor(input.kind);
	if (!descriptor) {
		return renderUnknown(input.kind);
	}
	return renderDescriptor(descriptor, input);
}

function renderUnknown(kind: string): ReactNode {
	if (markKindWarned(kind)) {
		console.warn(`@tbtop/admin: no block descriptor registered for kind "${kind}"`);
	}
	return <UnknownBlock kind={kind} />;
}

export function renderDescriptor<TOptions>(
	descriptor: BlockDescriptor,
	input: InvokeInput<TOptions>,
): ReactNode {
	const defaults = (descriptor.defaultOptions as Record<string, unknown> | undefined) ?? {};
	const merged = { ...defaults, ...(input.options as Record<string, unknown>) };
	const props = {
		options: merged,
		meta: input.meta ?? {},
		ctx: input.ctx,
		children: input.children,
		renderChild: input.renderChild ?? NO_RENDER_CHILD,
	};
	return createElement(descriptor.render, props);
}
