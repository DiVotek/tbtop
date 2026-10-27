/**
 * TableHead — the sticky <thead>: optional reorder-handle column, select-all
 * checkbox, sortable column headers, an optional per-column search row, and
 * the trailing row-actions slot.
 */
import { useTranslation } from "../../i18n/i18n";
import { cn } from "../../lib/cn";
import { Checkbox } from "../../ui/checkbox";
import type { TableColumn } from "../types";
import { ColumnSearchInput } from "./columnSearchInput";
import { type StickyCellProps, useStickyCell } from "./stickyColumns";
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
	const reorderPin = useStickyCell("reorder");
	const bulkPin = useStickyCell("bulk");
	return (
		<thead className="cn-table-header sticky top-0 z-20 bg-muted text-left text-muted-foreground">
			<tr>
				{props.showReorderColumn && (
					<th
						{...reorderPin}
						className={cn("cn-table-head w-8", reorderPin.className)}
						aria-hidden="true"
					/>
				)}
				{props.hasBulk && (
					<th {...bulkPin} className={cn("cn-table-head w-8", bulkPin.className)}>
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
					{props.showReorderColumn && <SearchRowCell pin={reorderPin} />}
					{props.hasBulk && <SearchRowCell pin={bulkPin} />}
					{props.columns.map((col) => (
						<ColumnSearchCell
							key={`search-${col.name}`}
							col={col}
							value={props.colSearchValues?.[col.name]}
							onChange={props.onColSearchChange}
						/>
					))}
					{props.hasRowActions && <th className="px-2 py-1" />}
				</tr>
			)}
		</thead>
	);
}

// The search row's pinned cells reuse the head row's slots, so the offsets
// measured off the head row line them up. `data-sticky-slot` is dropped here:
// only head-row cells are measured.
function SearchRowCell({ pin }: { pin: StickyCellProps }) {
	return (
		<th
			className={cn("w-8 px-2 py-1", pin.className)}
			style={pin.style}
			data-sticky-edge={pin["data-sticky-edge"]}
			aria-hidden="true"
		/>
	);
}

function ColumnSearchCell(props: {
	col: TableColumn;
	value?: string;
	onChange?: (column: string, value: string) => void;
}) {
	const pin = useStickyCell({ column: props.col.name });
	return (
		<th
			className={cn("px-2 py-1 font-normal", pin.className)}
			style={pin.style}
			data-sticky-edge={pin["data-sticky-edge"]}
		>
			{props.col.columnSearchable && (
				<ColumnSearchInput
					column={props.col}
					value={props.value}
					onChange={props.onChange ?? (() => {})}
				/>
			)}
		</th>
	);
}
