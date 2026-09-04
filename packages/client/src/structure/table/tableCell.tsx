/**
 * RowDataCell + renderCell — one <td> and its render chain:
 * custom → editable → row-scoped kinds (image/link) → formatColumnValue.
 */
import type { ReactNode } from "react";
import { cn } from "../../lib/cn";
import { CopyButton } from "../../ui/copyButton";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../ui/tooltip";
import type { TableColumn } from "../types";
import { CellAffixes } from "./cellAffix";
import { ImageCell, LinkCell } from "./cellHelpers";
import { formatColumnValue } from "./columnValueFormat";
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

function readRowMap(
	row: Record<string, unknown>,
	col: TableColumn,
	key: "_tooltips" | "_descriptions",
): string | undefined {
	const map = row[key];
	if (!map || typeof map !== "object") {
		return undefined;
	}
	const value = (map as Record<string, unknown>)[col.name];
	return typeof value === "string" && value !== "" ? value : undefined;
}

/** Non-empty string per-row tooltip resolved server-side into `row._tooltips[col.name]`. */
function readRowTooltip(row: Record<string, unknown>, col: TableColumn): string | undefined {
	return readRowMap(row, col, "_tooltips");
}

function cellDescription(row: Record<string, unknown>, col: TableColumn): string | undefined {
	const perRow = readRowMap(row, col, "_descriptions");
	if (perRow !== undefined) {
		return perRow;
	}
	return typeof col.description === "string" && col.description !== ""
		? col.description
		: undefined;
}

function DescriptionLine({ text }: { text: string }) {
	return <div className="text-xs text-muted-foreground">{text}</div>;
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
	const wrapClass = cn(
		col.wrap === false && "truncate max-w-0",
		col.noWrap && "whitespace-nowrap",
	);
	return (
		<td
			className={cn("px-3 py-2", alignClass, wrapClass)}
			style={col.width ? { width: col.width } : undefined}
		>
			{col.kind === "group" ? (
				<GroupCell col={col} row={row} saveCell={saveCell} />
			) : (
				<CellInner col={col} row={row} saveCell={saveCell} />
			)}
		</td>
	);
}

function GroupCell({
	col,
	row,
	saveCell,
}: {
	col: TableColumn;
	row: Record<string, unknown>;
	saveCell?: (args: SaveCellArgs) => Promise<unknown>;
}) {
	const description = cellDescription(row, col);
	return (
		<>
			<div className="flex flex-col gap-0.5">
				{(col.columns ?? []).map((child) => (
					<div key={child.name}>
						<CellInner col={child} row={row} saveCell={saveCell} />
					</div>
				))}
			</div>
			{description ? <DescriptionLine text={description} /> : null}
		</>
	);
}

function CellInner({
	col,
	row,
	saveCell,
}: {
	col: TableColumn;
	row: Record<string, unknown>;
	saveCell?: (args: SaveCellArgs) => Promise<unknown>;
}) {
	const tooltip = readRowTooltip(row, col) ?? col.tooltip;
	const rendered = renderCell({ col, row, tooltip, saveCell });
	const textClass = cn(
		col.emphasized && "font-medium text-primary hover:underline",
		col.muted && "text-xs text-muted-foreground",
		col.uppercase && "uppercase tracking-wide",
	);
	const content = textClass ? <span className={textClass}>{rendered}</span> : rendered;
	const withTooltip = <CellTooltip tooltip={tooltip}>{content}</CellTooltip>;
	const description = cellDescription(row, col);
	return (
		<>
			{col.copyable ? (
				<span className="inline-flex items-center gap-1">
					{withTooltip}
					<CopyButton value={String(row[col.name] ?? "")} copyable={col.copyable} />
				</span>
			) : (
				withTooltip
			)}
			{description ? <DescriptionLine text={description} /> : null}
		</>
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
	return (
		<CellAffixes col={col} value={row[col.name]}>
			{renderDisplayValue(col, row, tooltip)}
		</CellAffixes>
	);
}

function renderDisplayValue(
	col: TableColumn,
	row: Record<string, unknown>,
	tooltip: string | undefined,
): ReactNode {
	if (col.kind === "image") {
		return <ImageCell value={row[col.name]} col={col} tooltip={tooltip} />;
	}
	if (col.kind === "link") {
		return <LinkCell value={row[col.name]} col={col} />;
	}
	return formatColumnValue(col, row[col.name]);
}
