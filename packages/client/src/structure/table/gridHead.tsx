/**
 * TableHead — the sticky <thead>: optional reorder-handle column, select-all
 * checkbox, sortable column headers, an optional per-column search row, and
 * the trailing row-actions slot.
 */
import { useTranslation } from "../../i18n/i18n";
import { Checkbox } from "../../ui/checkbox";
import type { TableColumn } from "../types";
import { ColumnSearchInput } from "./columnSearchInput";
import { SortableHeader } from "./tableHeader";

interface TableHeadProps {
	columns: TableColumn[];
	sort?: string;
	onSort: (col: string, dir?: "asc" | "desc") => void;
	hasBulk: boolean;
	hasRowActions: boolean;
	/** Leading reorder-handle column, rendered only when reorder is active. */
	showReorderColumn: boolean;
	allSelected: boolean;
	someSelected: boolean;
	onSelectAll: (checked: boolean) => void;
	/** Per-column search values, keyed by column name. */
	colSearchValues?: Record<string, string>;
	onColSearchChange?: (column: string, value: string) => void;
}

// New-gen shape: header row borders come from `cn-table-header` and the
// header cells from `cn-table-head` (`ui/presets/style-preset-*.css`), which
// also sets their padding (`h-10 px-2`) and `text-foreground`. Our deltas: the
// sticky/z-20/bg-muted positioning (the preset has no sticky header), and the
// per-column search row, which keeps its own tint and compact `py-1` cells
// (padded `px-2` to line up with the preset head cells).
export function TableHead(props: TableHeadProps) {
	const t = useTranslation();
	const hasColumnSearch = props.columns.some((c) => c.columnSearchable);
	return (
		<thead className="cn-table-header sticky top-0 z-20 bg-muted text-left text-muted-foreground">
			<tr>
				{props.showReorderColumn && <th className="cn-table-head w-8" aria-hidden="true" />}
				{props.hasBulk && (
					<th className="cn-table-head w-8">
						<Checkbox
							className="cursor-pointer"
							checked={props.someSelected ? "indeterminate" : props.allSelected}
							onCheckedChange={(next) => props.onSelectAll(next === true)}
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
				{props.hasRowActions && <th className="cn-table-head" />}
			</tr>
			{hasColumnSearch && (
				<tr className="bg-muted/60" data-testid="table-column-search-row">
					{props.showReorderColumn && <th className="w-8 px-2 py-1" aria-hidden="true" />}
					{props.hasBulk && <th className="w-8 px-2 py-1" aria-hidden="true" />}
					{props.columns.map((col) => (
						<th key={`search-${col.name}`} className="px-2 py-1 font-normal">
							{col.columnSearchable && (
								<ColumnSearchInput
									column={col}
									value={props.colSearchValues?.[col.name]}
									onChange={props.onColSearchChange ?? (() => {})}
								/>
							)}
						</th>
					))}
					{props.hasRowActions && <th className="px-2 py-1" />}
				</tr>
			)}
		</thead>
	);
}
