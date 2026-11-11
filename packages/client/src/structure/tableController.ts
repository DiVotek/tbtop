import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ListQueryParams, TableController } from "./types";

function toggleId(prev: string[], id: string): string[] {
	return prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id];
}

interface UseTableControllerInput {
	name?: string;
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
	selectAllMatching: () => void;
	clearSelection: () => void;
}

/**
 * The checked rows, and whether the pick widened to every matching row.
 * Both reset when the rows change (page, filters, a refetch after an action).
 */
function useSelection(rows: unknown[]) {
	const [selectedIds, setSelectedIds] = useState<string[]>([]);
	const [allMatching, setAllMatching] = useState(false);
	const rowsRef = useRef(rows);

	useEffect(() => {
		if (rowsRef.current === rows) {
			return;
		}
		rowsRef.current = rows;
		setSelectedIds([]);
		setAllMatching(false);
	}, [rows]);

	// Any change to the checked rows narrows an all-matching pick back to them.
	const toggleSelection = useCallback((id: string) => {
		setAllMatching(false);
		setSelectedIds((prev) => toggleId(prev, id));
	}, []);

	const selectAll = useCallback((ids: string[]) => {
		setAllMatching(false);
		setSelectedIds(ids);
	}, []);

	const selectAllMatching = useCallback(() => setAllMatching(true), []);

	const clearSelection = useCallback(() => {
		setAllMatching(false);
		setSelectedIds([]);
	}, []);

	return {
		selectedIds,
		allMatching,
		toggleSelection,
		selectAll,
		selectAllMatching,
		clearSelection,
	};
}

export function useTableController(input: UseTableControllerInput): TableControllerInternal {
	const { onChangeParams, onRefresh } = input;
	const selection = useSelection(input.rows);
	const { selectedIds, allMatching } = selection;
	const refresh = useCallback(() => onRefresh(), [onRefresh]);

	const setQuery = useCallback(
		(patch: Partial<ListQueryParams>) => onChangeParams(patch),
		[onChangeParams],
	);

	const { toggleSelection, selectAll, selectAllMatching, clearSelection } = selection;
	return useMemo<TableControllerInternal>(
		() => ({
			name: input.name,
			rows: input.rows,
			total: input.total,
			selectedIds,
			allMatching,
			queryParams: input.queryParams,
			refresh,
			setQuery,
			toggleSelection,
			selectAll,
			selectAllMatching,
			clearSelection,
		}),
		[
			input.name,
			input.rows,
			input.total,
			selectedIds,
			allMatching,
			input.queryParams,
			refresh,
			setQuery,
			toggleSelection,
			selectAll,
			selectAllMatching,
			clearSelection,
		],
	);
}
