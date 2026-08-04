/**
 * Formats a single column value the same way its cell would, without any row
 * context (no custom render(row), no editable widget, no per-row tooltip).
 * Shared by RowDataCell (structure/table/tableCell.tsx) and GroupHeaderRow
 * (structure/table/rowGroups.tsx) so a group header never re-derives its own
 * text for a boolean/badge/select/date/relation column.
 */
import type { ReactNode } from "react";
import { getBlockDescriptor } from "../../render/blockRegistry";
import { renderDescriptor } from "../../render/renderDescriptor";
import type { TableColumn } from "../types";
import { BadgeCell, BooleanIconCell, ColorCell, IconMapCell, TimeCell } from "./cellHelpers";

/**
 * Renders `value` as the column's `kind` cell would. Callers that also need
 * row-scoped behavior (col.render, col.editable, tooltips, copyable) stay on
 * their own render path and only reach here for the shared kind branches.
 */
export function formatColumnValue(col: TableColumn, value: unknown): ReactNode {
	if (col.kind === "badge") {
		return <BadgeCell value={value} col={col} />;
	}
	if (col.kind === "boolean") {
		return <BooleanIconCell value={value} col={col} />;
	}
	if (col.kind === "icon") {
		return <IconMapCell value={value} col={col} />;
	}
	if (col.kind === "color") {
		return <ColorCell value={value} col={col} />;
	}
	if (col.kind === "time") {
		return <TimeCell value={value} />;
	}
	// Server already formatted the value with an explicit format — render it
	// as-is. Reparsing "09.07.2026" via new Date() would misread it (US order)
	// and re-localize, discarding the format the page author chose.
	if ((col.kind === "date" || col.kind === "datetime") && col.format) {
		return String(value ?? "");
	}
	const descriptor = col.kind ? getBlockDescriptor(col.kind) : undefined;
	if (descriptor?.behavior === "field") {
		return renderDescriptor(descriptor, {
			kind: col.kind ?? "",
			// A select/radio-kind column only carries its {value, label} choices
			// when it's editable (Column::options()) — forward them so the cell
			// (and this same formatter, reused for group headers) can resolve a
			// label instead of falling back to the raw value.
			options: { name: col.name, options: col.editable?.options },
			meta: {},
			ctx: {
				surface: "cell",
				binding: { name: col.name, value, onChange: () => {} },
			},
			children: undefined,
			renderChild: () => null,
		});
	}
	return String(value ?? "");
}
