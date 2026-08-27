import type { ReactNode } from "react";
import { renderNode } from "../../render/structureRenderer";
import type { TableColumn } from "../types";

/**
 * Wraps a display cell's value with the column's prefix/suffix nodes. Boolean
 * cells render an icon, so a unit around it is meaningless — they opt out.
 */
export function CellAffixes({ col, children }: { col: TableColumn; children: ReactNode }) {
	if ((!col.prefix && !col.suffix) || col.kind === "boolean") {
		return <>{children}</>;
	}
	return (
		<span className="inline-flex items-baseline gap-1">
			{col.prefix && <Affix side="prefix" node={col.prefix} />}
			{children}
			{col.suffix && <Affix side="suffix" node={col.suffix} />}
		</span>
	);
}

function Affix({
	side,
	node,
}: {
	side: "prefix" | "suffix";
	node: NonNullable<TableColumn["prefix"]>;
}) {
	return (
		<span data-slot={`cell-${side}`} className="text-muted-foreground">
			{renderNode(node)}
		</span>
	);
}
