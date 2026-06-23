/**
 * RowDataCell + renderCell — one <td> and its render chain:
 * custom → editable → kind badge/boolean/icon → field → string.
 */
import type { ReactNode } from "react";
import { cn } from "../../lib/cn";
import { getBlockDescriptor } from "../../render/blockRegistry";
import { renderDescriptor } from "../../render/renderDescriptor";
import type { TableColumn } from "../types";
import { BadgeCell, BooleanIconCell, IconMapCell, ImageCell } from "./cellHelpers";
import { EditableCell } from "./editableCell";

type SaveCellArgs = { column: string; id: string; value: unknown };

function rowColAlignClass(align: TableColumn["align"]): string {
	if (align === "center") {
		return "text-center";
	}
	if (align === "right") {
		return "text-right";
	}
	return "";
}

export function RowDataCell({
	col,
	row,
	saveCell,
}: {
	col: TableColumn;
	row: Record<string, unknown>;
	saveCell?: (args: SaveCellArgs) => Promise<unknown>;
}) {
	const alignClass = rowColAlignClass(col.align);
	const wrapClass = col.wrap === false ? "truncate max-w-0" : "";
	return (
		<td
			className={cn("px-3 py-2", alignClass, wrapClass)}
			style={col.width ? { width: col.width } : undefined}
			title={col.tooltip}
		>
			{renderCell(col, row, saveCell)}
		</td>
	);
}

function renderCell(
	col: TableColumn,
	row: Record<string, unknown>,
	saveCell?: (args: SaveCellArgs) => Promise<unknown>,
): ReactNode {
	if (col.render) {
		return col.render(row);
	}
	if (col.editable) {
		return (
			<EditableCell
				col={col as TableColumn & { editable: NonNullable<TableColumn["editable"]> }}
				row={row}
				saveCell={saveCell}
			/>
		);
	}
	if (col.kind === "badge") {
		return <BadgeCell value={row[col.name]} col={col} />;
	}
	if (col.kind === "boolean") {
		return <BooleanIconCell value={row[col.name]} col={col} />;
	}
	if (col.kind === "icon") {
		return <IconMapCell value={row[col.name]} col={col} />;
	}
	if (col.kind === "image") {
		return <ImageCell value={row[col.name]} col={col} />;
	}
	const descriptor = col.kind ? getBlockDescriptor(col.kind) : undefined;
	if (descriptor?.behavior === "field") {
		return renderDescriptor(descriptor, {
			kind: col.kind ?? "",
			options: { name: col.name },
			meta: {},
			ctx: {
				surface: "cell",
				binding: { name: col.name, value: row[col.name], onChange: () => {} },
			},
			children: undefined,
			renderChild: () => null,
		});
	}
	return String(row[col.name] ?? "");
}
