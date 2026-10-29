/**
 * Memoized query-param handlers for the table body —
 * reset filters, remove one filter, sort, select tab.
 */
import { useCallback } from "react";
import type { ListQueryParams } from "../types";

interface TableParamHandlers {
	handleResetFilters: () => void;
	/** Drops one applied filter (a chip's ×); pending values of the others stay. */
	handleRemoveFilter: (name: string) => void;
	/** Drops every filter but keeps the search, unlike handleResetFilters. */
	handleClearFilters: () => void;
	handleSort: (col: string, dir: "asc" | "desc" | undefined) => void;
	handleSelectTab: (name: string) => void;
}

interface FilterState {
	applied: Record<string, unknown> | undefined;
	values: Record<string, unknown>;
	setValues: (vals: Record<string, unknown>) => void;
}

export function useTableParams(
	onChangeParams: (patch: Partial<ListQueryParams>) => void,
	filters: FilterState,
): TableParamHandlers {
	const { applied, values, setValues } = filters;
	const handleResetFilters = useCallback(() => {
		setValues({});
		onChangeParams({ filters: {}, search: undefined, page: 1 });
	}, [onChangeParams, setValues]);

	const handleRemoveFilter = useCallback(
		(name: string) => {
			setValues(omit(values, name));
			onChangeParams({ filters: omit(applied ?? {}, name), page: 1 });
		},
		[applied, values, onChangeParams, setValues],
	);

	const handleClearFilters = useCallback(() => {
		setValues({});
		onChangeParams({ filters: {}, page: 1 });
	}, [onChangeParams, setValues]);

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

	return {
		handleResetFilters,
		handleRemoveFilter,
		handleClearFilters,
		handleSort,
		handleSelectTab,
	};
}

function omit(values: Record<string, unknown>, name: string): Record<string, unknown> {
	const { [name]: _dropped, ...rest } = values;
	return rest;
}
