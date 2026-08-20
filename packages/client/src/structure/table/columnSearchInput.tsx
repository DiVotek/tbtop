/**
 * ColumnSearchInput — one per-column header search box.
 * Controlled draft + its own debounce instance, isolated from every other column.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "../../i18n/i18n";
import { useDebounce } from "../../lib/useDebounce";
import { Input } from "../../ui/input";
import type { TableColumn } from "../types";

interface ColumnSearchInputProps {
	column: TableColumn;
	value?: string;
	onChange: (column: string, value: string) => void;
}

export function ColumnSearchInput({ column, value = "", onChange }: ColumnSearchInputProps) {
	const t = useTranslation();
	const [draft, setDraft] = useState(value);
	const valueGeneration = useRef(0);
	useEffect(() => {
		valueGeneration.current += 1;
		setDraft(value);
	}, [value]);
	const debouncedChange = useDebounce(
		useCallback(
			(next: string, generation: number) => {
				if (generation === valueGeneration.current) {
					onChange(column.name, next);
				}
			},
			[column.name, onChange],
		),
		300,
	);
	return (
		<Input
			type="search"
			value={draft}
			placeholder={t("table.search.placeholder")}
			className="h-7 text-xs font-normal"
			data-testid={`table-col-search-${column.name}`}
			aria-label={t("table.column_search.aria_label").replace(
				"{column}",
				column.label ?? column.name,
			)}
			onChange={(e) => {
				const next = e.target.value;
				setDraft(next);
				debouncedChange(next, valueGeneration.current);
			}}
		/>
	);
}
