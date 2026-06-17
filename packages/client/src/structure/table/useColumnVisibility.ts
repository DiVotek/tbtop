/**
 * Column-visibility state for a table: which columns are shown, persisted to
 * localStorage under a table-name-derived key. Extracted from tableBlock.tsx.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import type { TableColumn } from "../types";

export interface ColumnVisibility {
	visibleColumns: Set<string>;
	toggleColumn: (name: string) => void;
}

export function useColumnVisibility(columns: TableColumn[], tableName: string): ColumnVisibility {
	// Key by table name; fall back to a col-join for unnamed tables to preserve
	// backward compat with existing persisted state + tests.
	const storageKey = tableName
		? `tbtop.table.${tableName}.columns`
		: `tbtop.table.${columns.map((c) => c.name).join("-")}.columns`;

	// Default visibility: hide columns flagged hiddenByDefault.
	const defaultVisible = useMemo(
		() => new Set(columns.filter((c) => c.hiddenByDefault !== true).map((c) => c.name)),
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[storageKey],
	);

	const [visibleColumns, setVisibleColumns] = useState<Set<string>>(defaultVisible);

	useEffect(() => {
		try {
			const stored = localStorage.getItem(storageKey);
			if (stored) {
				setVisibleColumns(new Set(JSON.parse(stored) as string[]));
			}
		} catch {
			// ignore storage errors
		}
	}, [storageKey]);

	const toggleColumn = useCallback(
		(name: string) => {
			setVisibleColumns((prev) => {
				const next = new Set(prev);
				if (next.has(name)) {
					next.delete(name);
				} else {
					next.add(name);
				}
				try {
					localStorage.setItem(storageKey, JSON.stringify([...next]));
				} catch {
					// ignore storage errors
				}
				return next;
			});
		},
		[storageKey],
	);

	return { visibleColumns, toggleColumn };
}

/** Counts filter values that are meaningfully set (non-empty). */
export function countActiveFilters(filterValues: Record<string, unknown>): number {
	return Object.values(filterValues).filter(isActiveFilterValue).length;
}

function isActiveFilterValue(v: unknown): boolean {
	if (v === null || v === undefined || v === "") {
		return false;
	}
	if (Array.isArray(v)) {
		return v.length > 0;
	}
	if (typeof v === "object") {
		const obj = v as Record<string, unknown>;
		return Boolean(obj.from) || Boolean(obj.to);
	}
	return true;
}
