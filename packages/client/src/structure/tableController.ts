import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ListQueryParams, TableController } from "./types";

interface UseTableControllerInput {
	rows: unknown[];
	queryParams: ListQueryParams;
	onChangeParams: (patch: Partial<ListQueryParams>) => void;
	onRefresh: () => void;
}

interface TableControllerInternal extends TableController {
	toggleSelection: (id: string) => void;
}

export function useTableController(input: UseTableControllerInput): TableControllerInternal {
	const [selectedIds, setSelectedIds] = useState<string[]>([]);
	const { onChangeParams, onRefresh } = input;
	const rowsRef = useRef(input.rows);

	useEffect(() => {
		if (rowsRef.current === input.rows) {
			return;
		}
		rowsRef.current = input.rows;
		setSelectedIds([]);
	}, [input.rows]);

	const refresh = useCallback(() => onRefresh(), [onRefresh]);

	const setQuery = useCallback(
		(patch: Partial<ListQueryParams>) => onChangeParams(patch),
		[onChangeParams],
	);

	const toggleSelection = useCallback((id: string) => {
		setSelectedIds((prev) =>
			prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
		);
	}, []);

	return useMemo<TableControllerInternal>(
		() => ({
			rows: input.rows,
			selectedIds,
			queryParams: input.queryParams,
			refresh,
			setQuery,
			toggleSelection,
		}),
		[input.rows, selectedIds, input.queryParams, refresh, setQuery, toggleSelection],
	);
}
