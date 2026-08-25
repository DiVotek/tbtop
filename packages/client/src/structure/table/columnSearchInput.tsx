/**
 * ColumnSearchInput — one per-column header search box.
 * Controlled draft + its own debounce instance, isolated from every other column.
 */
import { useCallback, useRef, useState } from "react";
import { useTranslation } from "../../i18n/i18n";
import { useDebounce } from "../../lib/useDebounce";
import { useReconciled } from "../../lib/useReconciled";
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
	const incoming = useReconciled(value);
	// An externally reset value supersedes a pending debounce, which would
	// otherwise write the abandoned draft back.
	const draftGeneration = useRef(0);
	if (incoming.changed) {
		incoming.accept();
		draftGeneration.current += 1;
		setDraft(value);
	}
	const debouncedChange = useDebounce(
		useCallback(
			(next: string, generation: number) => {
				if (generation === draftGeneration.current) {
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
				debouncedChange(next, draftGeneration.current);
			}}
		/>
	);
}
