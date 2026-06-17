/**
 * Memoized query-param handlers for the table body —
 * reset filters, sort, select tab.
 */
import { useCallback } from "react";
import type { ListQueryParams } from "../types";

interface TableParamHandlers {
	handleResetFilters: () => void;
	handleSort: (col: string, dir: "asc" | "desc" | undefined) => void;
	handleSelectTab: (name: string) => void;
}

export function useTableParams(
	onChangeParams: (patch: Partial<ListQueryParams>) => void,
	setFilterValues: (vals: Record<string, unknown>) => void,
): TableParamHandlers {
	const handleResetFilters = useCallback(() => {
		setFilterValues({});
		onChangeParams({ filters: {}, search: undefined, page: 1 });
	}, [onChangeParams, setFilterValues]);

	const handleSort = useCallback(
		(col: string, dir: "asc" | "desc" | undefined) => {
			onChangeParams({ sort: dir ? `${col}:${dir}` : undefined, page: 1 });
		},
		[onChangeParams],
	);

	const handleSelectTab = useCallback(
		(name: string) => {
			onChangeParams({ tab: name, page: 1 });
		},
		[onChangeParams],
	);

	return { handleResetFilters, handleSort, handleSelectTab };
}
