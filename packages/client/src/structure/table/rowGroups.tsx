/**
 * Row grouping (v1): partitions already-sorted rows into contiguous runs by
 * a column's value and renders a full-width header before each run.
 */
import type { ReactNode } from "react";

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

interface GroupHeaderRowProps {
	value: unknown;
	colSpan: number;
}

export function GroupHeaderRow({ value, colSpan }: GroupHeaderRowProps): ReactNode {
	const label = value == null || value === "" ? "—" : String(value);
	return (
		<tr className="bg-muted/50">
			<td colSpan={colSpan} className="px-3 py-1.5 text-xs font-medium text-muted-foreground">
				{label}
			</td>
		</tr>
	);
}
