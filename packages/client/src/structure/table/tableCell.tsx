/**
 * RowDataCell + renderCell — one <td> and its render chain:
 * custom → editable → kind badge/boolean/icon → field → string.
 */
import type { ReactNode } from "react";
import { cn } from "../../lib/cn";
import { getBlockDescriptor } from "../../render/blockRegistry";
import { renderDescriptor } from "../../render/renderDescriptor";
import { CopyButton } from "../../ui/copyButton";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../ui/tooltip";
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

/** Non-empty string per-row tooltip resolved server-side into `row._tooltips[col.name]`. */
function readRowTooltip(row: Record<string, unknown>, col: TableColumn): string | undefined {
	const tooltips = row._tooltips;
	if (!tooltips || typeof tooltips !== "object") {
		return undefined;
	}
	const value = (tooltips as Record<string, unknown>)[col.name];
	return typeof value === "string" && value !== "" ? value : undefined;
}

function CellTooltip({ tooltip, children }: { tooltip?: string; children: ReactNode }) {
	if (!tooltip) {
		return <>{children}</>;
	}
	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<span>{children}</span>
			</TooltipTrigger>
			<TooltipContent>{tooltip}</TooltipContent>
		</Tooltip>
	);
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
	const tooltip = readRowTooltip(row, col) ?? col.tooltip;
	const rendered = renderCell({ col, row, tooltip, saveCell });
	// Text-style flags: emphasized = primary link-style label (pairs with
	// rowClick), muted = small secondary metadata, uppercase = code-like values.
	const textClass = cn(
		col.emphasized && "font-medium text-primary hover:underline",
		col.muted && "text-xs text-muted-foreground",
		col.uppercase && "uppercase tracking-wide",
	);
	const content = textClass ? <span className={textClass}>{rendered}</span> : rendered;
	const withTooltip = <CellTooltip tooltip={tooltip}>{content}</CellTooltip>;
	return (
		<td
			className={cn("px-3 py-2", alignClass, wrapClass)}
			style={col.width ? { width: col.width } : undefined}
		>
			{col.copyable ? (
				<span className="inline-flex items-center gap-1">
					{withTooltip}
					<CopyButton value={String(row[col.name] ?? "")} copyable={col.copyable} />
				</span>
			) : (
				withTooltip
			)}
		</td>
	);
}

interface RenderCellArgs {
	col: TableColumn;
	row: Record<string, unknown>;
	tooltip: string | undefined;
	saveCell?: (args: SaveCellArgs) => Promise<unknown>;
}

function renderCell({ col, row, tooltip, saveCell }: RenderCellArgs): ReactNode {
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
		return <ImageCell value={row[col.name]} col={col} tooltip={tooltip} />;
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
	// Server already formatted the value with an explicit format — render it
	// as-is. Reparsing "09.07.2026" via new Date() would misread it (US order)
	// and re-localize, discarding the format the page author chose.
	if ((col.kind === "date" || col.kind === "datetime") && col.format) {
		return String(row[col.name] ?? "");
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
