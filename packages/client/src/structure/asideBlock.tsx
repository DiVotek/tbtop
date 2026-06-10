import { Fragment, type ReactNode } from "react";
import type { RenderProps } from "../render/blockRegistry";
import type { StructureNode } from "./structure";

interface AsideOptions {
	[key: string]: unknown;
}

export function AsideBlock({ children, renderChild }: RenderProps<AsideOptions>) {
	return (
		<div className="w-80 shrink-0" data-testid="aside-block">
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
