/**
 * ColumnSearchInput — one per-column header search box.
 * Uncontrolled + its own debounce instance, isolated from every other column.
 */
import { useCallback } from "react";
import { useTranslation } from "../../i18n/i18n";
import { useDebounce } from "../../lib/useDebounce";
import { Input } from "../../ui/input";
import type { TableColumn } from "../types";

interface ColumnSearchInputProps {
	column: TableColumn;
	defaultValue?: string;
	onChange: (column: string, value: string) => void;
}

export function ColumnSearchInput({ column, defaultValue, onChange }: ColumnSearchInputProps) {
	const t = useTranslation();
	const debouncedChange = useDebounce(
		useCallback((value: string) => onChange(column.name, value), [column.name, onChange]),
		300,
	);
	return (
		<Input
			type="search"
			defaultValue={defaultValue}
			placeholder={t("table.search.placeholder")}
			className="h-7 text-xs font-normal"
			data-testid={`table-col-search-${column.name}`}
			aria-label={t("table.column_search.aria_label").replace(
				"{column}",
				column.label ?? column.name,
			)}
			onChange={(e) => debouncedChange(e.target.value)}
		/>
	);
}
