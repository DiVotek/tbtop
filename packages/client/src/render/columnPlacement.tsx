import type { ReactNode } from "react";
import { type ColumnPlacementBag, resolveColumnPlacement } from "../structure/columnsSpec";

/**
 * Wraps a rendered node in the `.field-col-place` grid-placement class when
 * its options carry colSpan/colStart — a no-op outside a grid/columns parent.
 */
export function applyColumnPlacement(rendered: ReactNode, options: ColumnPlacementBag): ReactNode {
	const placement = resolveColumnPlacement(options);
	if (!placement.className) {
		return rendered;
	}
	return (
		<div className={placement.className} style={placement.style}>
			{rendered}
		</div>
	);
}
