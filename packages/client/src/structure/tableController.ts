import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ListQueryParams, TableController } from "./types";

function toggleId(prev: string[], id: string): string[] {
	return prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id];
}

interface UseTableControllerInput {
	rows: unknown[];
	/** Total record count from paginated response; undefined for non-paginated. */
	total?: number;
	queryParams: ListQueryParams;
	onChangeParams: (patch: Partial<ListQueryParams>) => void;
	onRefresh: () => void;
}

interface TableControllerInternal extends TableController {
	toggleSelection: (id: string) => void;
	selectAll: (ids: string[]) => void;
	clearSelection: () => void;
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

	const toggleSelection = useCallback(
		(id: string) => setSelectedIds((prev) => toggleId(prev, id)),
		[],
	);

	const selectAll = useCallback((ids: string[]) => setSelectedIds(ids), []);

	const clearSelection = useCallback(() => setSelectedIds([]), []);

	return useMemo<TableControllerInternal>(
		() => ({
			rows: input.rows,
			total: input.total,
			selectedIds,
			queryParams: input.queryParams,
			refresh,
			setQuery,
			toggleSelection,
			selectAll,
			clearSelection,
		}),
		[
			input.rows,
			input.total,
			selectedIds,
			input.queryParams,
			refresh,
			setQuery,
			toggleSelection,
			selectAll,
			clearSelection,
		],
	);
}
