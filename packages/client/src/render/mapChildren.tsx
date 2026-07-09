import { Fragment, type ReactNode } from "react";
import type { StructureNode } from "../structure/structure";

export function mapChildren(
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
