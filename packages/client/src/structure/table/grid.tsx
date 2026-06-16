/**
 * TableGrid — the <table> element: sticky header (sort, select-all), rows,
 * empty state, and reload overlay. Row + cell rendering lives in tableRow.tsx;
 * response/sort helpers in normalize.ts.
 */
import { useTranslation } from "../../i18n/i18n";
import { ReloadOverlay } from "../../ui/spinner";
import type { ActionConfig, TableColumn } from "../types";
import { EmptyState } from "./emptyState";
import { isSelected, readId } from "./normalize";
import { SortableHeader } from "./tableHeader";
import { TableRow } from "./tableRow";

// Re-export response/sort helpers from their home so existing importers
// (tableBlock + tests) keep working through the grid module.
export { normalizeRows, parseSortParam } from "./normalize";

type SaveCellArgs = { column: string; id: string; value: unknown };

interface TableGridProps {
	rows: Record<string, unknown>[];
	columns: TableColumn[];
	rowActions: ActionConfig[];
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
}

export function TableGrid(props: TableGridProps) {
	const t = useTranslation();
	const isEmpty = props.rows.length === 0;
	const allIds = props.rows.map((r) => readId(r)).filter((id): id is string => !!id);
	const allSelected = allIds.length > 0 && allIds.every((id) => props.selectedIds.includes(id));
	const someSelected = !allSelected && allIds.some((id) => props.selectedIds.includes(id));

	function handleSelectAll(checked: boolean) {
		if (checked) {
			props.onSelectAll(allIds);
		} else {
			props.onClearSelection();
		}
	}

	const colSpan = props.columns.length + (props.hasBulk ? 1 : 0) + (props.hasRowActions ? 1 : 0);

	return (
		<div className="relative overflow-x-auto rounded-md border">
			{/* Reload overlay sits below the sticky header (z-20 > overlay z-10). */}
			{props.isReloading && <ReloadOverlay testId="table-reloading-overlay" />}

			<table className="w-full text-sm">
				<thead className="sticky top-0 z-20 border-b bg-muted text-left text-muted-foreground">
					<tr>
						{props.hasBulk && (
							<th className="w-8 px-3 py-2">
								<input
									type="checkbox"
									className="size-4 cursor-pointer accent-primary"
									checked={allSelected}
									ref={(el) => {
										if (el) {
											el.indeterminate = someSelected;
										}
									}}
									onChange={(e) => handleSelectAll(e.target.checked)}
									aria-label={t("table.select_all")}
									data-testid="table-select-all"
								/>
							</th>
						)}
						{props.columns.map((col) => (
							<SortableHeader
								key={col.name}
								col={col}
								sort={props.sort}
								onSort={props.onSort}
							/>
						))}
						{props.hasRowActions && <th className="px-3 py-2" />}
					</tr>
				</thead>
				<tbody>
					{isEmpty ? (
						<tr>
							<td colSpan={colSpan}>
								<EmptyState
									hasActiveFilters={props.hasActiveFilters}
									onReset={props.onResetFilters}
								/>
							</td>
						</tr>
					) : (
						props.rows.map((row, ri) => (
							<TableRow
								key={readId(row) ?? `row-${ri}`}
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
						))
					)}
				</tbody>
			</table>
		</div>
	);
}
