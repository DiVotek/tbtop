/**
 * TableGrid — the <table>: sticky header (sort, select-all, reorder handle),
 * rows, empty state, reload overlay, and the optional drag-reorder context.
 */
import { DndContext } from "@dnd-kit/core";
import { restrictToParentElement, restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { ReactNode } from "react";
import { ReloadOverlay } from "../../ui/spinner";
import type { TableColumn } from "../types";
import { EmptyState } from "./emptyState";
import { TableHead } from "./gridHead";
import { isSelected, readId } from "./normalize";
import { ReorderHint } from "./reorderHint";
import type { RowActionEntry } from "./rowActions";
import { SortableRow } from "./sortableRow";
import { TableRow } from "./tableRow";
import { useRowReorder } from "./useRowReorder";

// Re-export response/sort helpers from their home so existing importers
// (tableBlock + tests) keep working through the grid module.
export { normalizeRows, parseSortParam } from "./normalize";

type SaveCellArgs = { column: string; id: string; value: unknown };

interface TableGridProps {
	rows: Record<string, unknown>[];
	columns: TableColumn[];
	rowActions: RowActionEntry[];
	selectedIds: string[];
	onToggle: (id: string) => void;
	onSelectAll: (ids: string[]) => void;
	onClearSelection: () => void;
	hasBulk: boolean;
	hasRowActions: boolean;
	/** Currently applied sort, e.g. "title:asc" */
	sort?: string;
	onSort: (col: string, dir?: "asc" | "desc") => void;
	isReloading?: boolean;
	hasActiveFilters: boolean;
	onResetFilters: () => void;
	/** Name of a row action to trigger on row click. */
	rowClick?: string;
	saveCell?: (args: SaveCellArgs) => Promise<unknown>;
	/** Reorder column when the table declares reorderable(); undefined otherwise. */
	reorderColumn?: string;
	/** True only when reordering is currently allowed (no sort/filter/foreign tab). */
	reorderEnabled?: boolean;
	reorderRows?: (ids: string[]) => Promise<unknown>;
	onRefresh?: () => void;
}

export function TableGrid(props: TableGridProps) {
	const reorderFeature = Boolean(props.reorderColumn);
	const reorderActive = reorderFeature && Boolean(props.reorderEnabled);

	const reorder = useRowReorder({
		rows: props.rows,
		enabled: reorderActive,
		onRefresh: props.onRefresh,
		reorderRows: props.reorderRows,
	});

	// Only use the reorder hook's state-managed rows when reorder is actually
	// active; otherwise render props.rows directly to avoid a props-to-state lag.
	const rows = reorderActive ? reorder.rows : props.rows;
	const isEmpty = rows.length === 0;
	const allIds = rows.map((r) => readId(r)).filter((id): id is string => !!id);
	const allSelected = allIds.length > 0 && allIds.every((id) => props.selectedIds.includes(id));
	const someSelected = !allSelected && allIds.some((id) => props.selectedIds.includes(id));

	function handleSelectAll(checked: boolean) {
		if (checked) {
			props.onSelectAll(allIds);
		} else {
			props.onClearSelection();
		}
	}

	const colSpan =
		props.columns.length +
		(props.hasBulk ? 1 : 0) +
		(props.hasRowActions ? 1 : 0) +
		(reorderActive ? 1 : 0);

	const body = isEmpty ? (
		<tr>
			<td colSpan={colSpan}>
				<EmptyState
					hasActiveFilters={props.hasActiveFilters}
					onReset={props.onResetFilters}
				/>
			</td>
		</tr>
	) : (
		rows.map((row) => renderRow(row, props, reorderActive))
	);

	const shell = (
		<div className="relative overflow-x-auto rounded-md border">
			{/* Reload overlay sits below the sticky header (z-20 > overlay z-10). */}
			{props.isReloading && <ReloadOverlay testId="table-reloading-overlay" />}
			{reorderFeature && !reorderActive && <ReorderHint />}

			<table className="w-full text-sm">
				<TableHead
					columns={props.columns}
					sort={props.sort}
					onSort={props.onSort}
					hasBulk={props.hasBulk}
					hasRowActions={props.hasRowActions}
					showReorderColumn={reorderActive}
					allSelected={allSelected}
					someSelected={someSelected}
					onSelectAll={handleSelectAll}
				/>
				<tbody>{body}</tbody>
			</table>
		</div>
	);

	if (!reorderActive) {
		return shell;
	}

	// DndContext wraps the table (not its <tbody>) so dnd-kit's hidden a11y
	// node never becomes an invalid direct child of <table>.
	return (
		<DndContext
			sensors={reorder.sensors}
			onDragEnd={reorder.onDragEnd}
			modifiers={[restrictToVerticalAxis, restrictToParentElement]}
		>
			<SortableContext items={allIds} strategy={verticalListSortingStrategy}>
				{shell}
			</SortableContext>
		</DndContext>
	);
}

function renderRow(
	row: Record<string, unknown>,
	props: TableGridProps,
	reorderActive: boolean,
): ReactNode {
	const key = readId(row) ?? JSON.stringify(row);
	if (reorderActive) {
		return (
			<SortableRow
				key={key}
				row={row}
				columns={props.columns}
				rowActions={props.rowActions}
				selected={isSelected(props.selectedIds, row)}
				onToggle={props.onToggle}
				hasBulk={props.hasBulk}
				hasRowActions={props.hasRowActions}
				saveCell={props.saveCell}
			/>
		);
	}
	return (
		<TableRow
			key={key}
			row={row}
			columns={props.columns}
			rowActions={props.rowActions}
			selected={isSelected(props.selectedIds, row)}
			onToggle={props.onToggle}
			hasBulk={props.hasBulk}
			hasRowActions={props.hasRowActions}
			rowClick={props.rowClick}
			saveCell={props.saveCell}
		/>
	);
}
