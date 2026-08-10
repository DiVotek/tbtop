/**
 * Column-visibility state for a table: which columns are shown, persisted to
 * localStorage under a table-name-derived key. Extracted from tableBlock.tsx.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { storageKey } from "../../app/storageKey";
import type { TableColumn } from "../types";

export interface ColumnVisibility {
	visibleColumns: Set<string>;
	toggleColumn: (name: string) => void;
}

/** Resolves the visible set from the current columns plus explicit user overrides. */
function resolveVisible(columns: TableColumn[], overrides: Record<string, boolean>): Set<string> {
	const visible = new Set<string>();
	for (const col of columns) {
		const shown = Object.hasOwn(overrides, col.name)
			? overrides[col.name]
			: col.hiddenByDefault !== true;
		if (shown) {
			visible.add(col.name);
		}
	}
	return visible;
}

function readOverrides(key: string): Record<string, boolean> {
	try {
		const stored = localStorage.getItem(key);
		return stored ? (JSON.parse(stored) as Record<string, boolean>) : {};
	} catch {
		return {};
	}
}

export function useColumnVisibility(columns: TableColumn[], tableName: string): ColumnVisibility {
	// Key by table name; unnamed tables fall back to a col-join so their state
	// stays distinct from other tables on the page. `v2` marks the switch from
	// a flat visible-names array to a map of explicit deviations from default;
	// old-format entries are inert dead bytes, not migrated.
	const key = tableName
		? storageKey("table", tableName, "columns", "v2")
		: storageKey("table", columns.map((c) => c.name).join("-"), "columns", "v2");

	const [overrides, setOverrides] = useState<Record<string, boolean>>(() => readOverrides(key));

	useEffect(() => {
		setOverrides(readOverrides(key));
	}, [key]);

	const visibleColumns = useMemo(() => resolveVisible(columns, overrides), [columns, overrides]);

	const toggleColumn = useCallback(
		(name: string) => {
			const next = { ...overrides, [name]: !visibleColumns.has(name) };
			setOverrides(next);
			try {
				localStorage.setItem(key, JSON.stringify(next));
			} catch {
				// ignore storage errors
			}
		},
		[key, overrides, visibleColumns],
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
