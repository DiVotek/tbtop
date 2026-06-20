/**
 * TableHead — the sticky <thead>: optional reorder-handle column, select-all
 * checkbox, sortable column headers, and the trailing row-actions slot.
 */
import { useTranslation } from "../../i18n/i18n";
import type { TableColumn } from "../types";
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
}

export function TableHead(props: TableHeadProps) {
	const t = useTranslation();
	return (
		<thead className="sticky top-0 z-20 border-b bg-muted text-left text-muted-foreground">
			<tr>
				{props.showReorderColumn && <th className="w-8 px-2 py-2" aria-hidden="true" />}
				{props.hasBulk && (
					<th className="w-8 px-3 py-2">
						<input
							type="checkbox"
							className="size-4 cursor-pointer accent-primary"
							checked={props.allSelected}
							ref={(el) => {
								if (el) {
									el.indeterminate = props.someSelected;
								}
							}}
							onChange={(e) => props.onSelectAll(e.target.checked)}
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
	);
}
