/**
 * Per-column search state for the header row — seeded from
 * queryParams.colSearch, pushed back through onChangeParams on change.
 */
import { useCallback, useRef, useState } from "react";
import type { ListQueryParams } from "../types";

export interface ColumnSearchState {
	colSearchValues: Record<string, string>;
	handleColSearchChange: (column: string, value: string) => void;
}

export function useColumnSearch(
	initial: Record<string, string> | undefined,
	onChangeParams: (patch: Partial<ListQueryParams>) => void,
): ColumnSearchState {
	const latestRef = useRef<Record<string, string>>(initial ?? {});
	const [colSearchValues, setColSearchValues] = useState(latestRef.current);

	// latestRef (not the closed-over state) backs `next` so independently
	// debounced columns firing back-to-back never overwrite one another.
	const handleColSearchChange = useCallback(
		(column: string, value: string) => {
			const next = { ...latestRef.current };
			if (value) {
				next[column] = value;
			} else {
				delete next[column];
			}
			latestRef.current = next;
			setColSearchValues(next);
			onChangeParams({ colSearch: next, page: 1 });
		},
		[onChangeParams],
	);

	return { colSearchValues, handleColSearchChange };
}
