/**
 * Per-column search state for the header row — seeded from
 * queryParams.colSearch, pushed back through onChangeParams on change.
 */
import { useCallback, useState } from "react";
import type { ListQueryParams } from "../types";

export interface ColumnSearchState {
	colSearchValues: Record<string, string>;
	handleColSearchChange: (column: string, value: string) => void;
}

export function useColumnSearch(
	initial: Record<string, string> | undefined,
	onChangeParams: (patch: Partial<ListQueryParams>) => void,
): ColumnSearchState {
	const [colSearchValues, setColSearchValues] = useState<Record<string, string>>(
		() => initial ?? {},
	);

	const handleColSearchChange = useCallback(
		(column: string, value: string) => {
			const next = { ...colSearchValues };
			if (value) {
				next[column] = value;
			} else {
				delete next[column];
			}
			setColSearchValues(next);
			onChangeParams({ colSearch: next, page: 1 });
		},
		[colSearchValues, onChangeParams],
	);

	return { colSearchValues, handleColSearchChange };
}
