/**
 * Row grouping: partitions already-sorted rows into contiguous runs by a
 * column's value and renders a full-width header before each run. A header
 * click collapses or expands its run.
 */
import { ChevronRightIcon } from "lucide-react";
import { type ReactNode, useState } from "react";
import { cn } from "../../lib/cn";
import type { TableColumn } from "../types";
import { formatColumnValue } from "./columnValueFormat";

export interface RowGroup {
	value: unknown;
	rows: Record<string, unknown>[];
}

/**
 * Splits `rows` into contiguous runs sharing the same `column` value.
 * Never re-sorts — a value repeating non-contiguously starts a new group.
 */
export function partitionRowGroups(rows: Record<string, unknown>[], column: string): RowGroup[] {
	const groups: RowGroup[] = [];
	for (const row of rows) {
		const value = row[column];
		const current = groups.at(-1);
		if (current && Object.is(current.value, value)) {
			current.rows.push(row);
		} else {
			groups.push({ value, rows: [row] });
		}
	}
	return groups;
}

/** Stable key for a group value, so collapse state survives a refetch or page change. */
export function groupKey(value: unknown): string {
	return value === undefined ? "undefined" : JSON.stringify(value);
}

export interface GroupCollapse {
	isCollapsed: (value: unknown) => boolean;
	toggle: (value: unknown) => void;
}

/**
 * Tracks the groups the user flipped away from `collapsedByDefault`, so a
 * group arriving later (next page, refetch) opens in the declared default.
 */
export function useGroupCollapse(collapsedByDefault: boolean): GroupCollapse {
	const [flipped, setFlipped] = useState<ReadonlySet<string>>(() => new Set());
	return {
		isCollapsed: (value) => flipped.has(groupKey(value)) !== collapsedByDefault,
		toggle: (value) =>
			setFlipped((prev) => {
				const next = new Set(prev);
				const key = groupKey(value);
				if (!next.delete(key)) {
					next.add(key);
				}
				return next;
			}),
	};
}

interface GroupHeaderRowProps {
	value: unknown;
	colSpan: number;
	/** The grouped column's config — reused so the header matches the cell's own formatting. */
	column: TableColumn;
	collapsed?: boolean;
	onToggle?: () => void;
}

export function GroupHeaderRow({
	value,
	colSpan,
	column,
	collapsed = false,
	onToggle,
}: GroupHeaderRowProps): ReactNode {
	const label = value == null || value === "" ? "—" : formatColumnValue(column, value);
	return (
		<tr className="bg-muted/50">
			<td colSpan={colSpan} className="p-0 text-xs font-medium text-muted-foreground">
				<button
					type="button"
					className="flex w-full items-center gap-1.5 px-3 py-1.5 text-left hover:text-foreground"
					onClick={onToggle}
					aria-expanded={!collapsed}
					data-testid="table-group-toggle"
				>
					<ChevronRightIcon
						aria-hidden
						className={cn(
							"size-3.5 shrink-0 transition-transform",
							!collapsed && "rotate-90",
						)}
					/>
					{label}
				</button>
			</td>
		</tr>
	);
}

interface GroupedRowsProps {
	rows: Record<string, unknown>[];
	column: TableColumn;
	colSpan: number;
	collapsedByDefault: boolean;
	renderRow: (row: Record<string, unknown>) => ReactNode;
}

/** Header + rows for each contiguous group; a collapsed group renders its header only. */
export function GroupedRows(props: GroupedRowsProps): ReactNode {
	const collapse = useGroupCollapse(props.collapsedByDefault);
	return partitionRowGroups(props.rows, props.column.name).flatMap((group, i) => {
		const collapsed = collapse.isCollapsed(group.value);
		const header = (
			<GroupHeaderRow
				key={`group-${i}`}
				value={group.value}
				colSpan={props.colSpan}
				column={props.column}
				collapsed={collapsed}
				onToggle={() => collapse.toggle(group.value)}
			/>
		);
		return collapsed ? [header] : [header, ...group.rows.map(props.renderRow)];
	});
}
