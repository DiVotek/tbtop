/** ColumnVisibilityDropdown — toggles which columns the grid shows. */
import { Columns3 } from "lucide-react";
import { useTranslation } from "../../i18n/i18n";
import { Button } from "../../ui/button";
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuTrigger,
} from "../../ui/dropdown-menu";
import type { TableColumn } from "../types";

interface ColumnVisibilityProps {
	columns: TableColumn[];
	visibleColumns: Set<string>;
	onToggle: (name: string) => void;
}

export function ColumnVisibilityDropdown({
	columns,
	visibleColumns,
	onToggle,
}: ColumnVisibilityProps) {
	const t = useTranslation();
	return (
		<div data-testid="column-visibility">
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button variant="outline" size="sm" data-testid="column-visibility-trigger">
						<Columns3 className="size-4" aria-hidden />
						{t("table.columns.label")}
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end">
					{columns.map((col) => (
						<DropdownMenuCheckboxItem
							key={col.name}
							checked={visibleColumns.has(col.name)}
							onCheckedChange={() => onToggle(col.name)}
							data-testid={`column-toggle-${col.name}`}
						>
							{col.label ?? col.name}
						</DropdownMenuCheckboxItem>
					))}
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	);
}
