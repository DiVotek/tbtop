/**
 * RowDataCell + renderCell — one <td> and its render chain:
 * custom → editable → kind badge/boolean/icon → field → string.
 */
import type { ReactNode } from "react";
import { cn } from "../../lib/cn";
import { getBlockDescriptor } from "../../render/blockRegistry";
import { renderDescriptor } from "../../render/renderDescriptor";
import { CopyButton } from "../../ui/copyButton";
import type { TableColumn } from "../types";
import {
	BadgeCell,
	BooleanIconCell,
	ColorCell,
	IconMapCell,
	ImageCell,
	LinkCell,
	TimeCell,
} from "./cellHelpers";
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
	const rendered = renderCell(col, row, saveCell);
	// Text-style flags: emphasized = primary link-style label (pairs with
	// rowClick), muted = small secondary metadata, uppercase = code-like values.
	const textClass = cn(
		col.emphasized && "font-medium text-primary hover:underline",
		col.muted && "text-xs text-muted-foreground",
		col.uppercase && "uppercase tracking-wide",
	);
	const content = textClass ? <span className={textClass}>{rendered}</span> : rendered;
	return (
		<td
			className={cn("px-3 py-2", alignClass, wrapClass)}
			style={col.width ? { width: col.width } : undefined}
			title={col.tooltip}
		>
			{col.copyable ? (
				<span className="inline-flex items-center gap-1">
					{content}
					<CopyButton value={String(row[col.name] ?? "")} copyable={col.copyable} />
				</span>
			) : (
				content
			)}
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
	if (col.kind === "color") {
		return <ColorCell value={row[col.name]} col={col} />;
	}
	if (col.kind === "time") {
		return <TimeCell value={row[col.name]} />;
	}
	if (col.kind === "link") {
		return <LinkCell value={row[col.name]} col={col} />;
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
