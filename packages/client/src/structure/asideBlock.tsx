import { Fragment, type ReactNode } from "react";
import { cn } from "../lib/cn";
import type { RenderProps } from "../render/blockRegistry";
import type { StructureNode } from "./structure";

interface AsideOptions {
	class?: string;
	[key: string]: unknown;
}

export function AsideBlock({ options, children, renderChild }: RenderProps<AsideOptions>) {
	return (
		<div className={cn("w-80 shrink-0", options.class)} data-testid="aside-block">
			{mapChildren(children, renderChild)}
		</div>
	);
}

function mapChildren(
	children: StructureNode[] | undefined,
	renderChild: (node: StructureNode) => ReactNode,
): ReactNode {
	if (!children) {
		return null;
	}
	return children.map((child, i) => (
		// biome-ignore lint/suspicious/noArrayIndexKey: structure nodes are positional
		<Fragment key={i}>{renderChild(child)}</Fragment>
	));
}
