/**
 * Open state of the aside filters panel, persisted per table to localStorage
 * next to the column layout. The server's filtersCollapsed() only seeds a
 * first visit; the user's toggle wins from then on.
 */
import { useCallback, useState } from "react";
import type { TableColumn } from "../types";
import { tableStateKey } from "./useColumnLayout";

export function useFiltersAside(
	columns: TableColumn[],
	tableName: string,
	collapsed: boolean,
): { open: boolean; toggle: () => void } {
	const key = tableStateKey(columns, tableName, "filtersAside", "v1");
	const [open, setOpen] = useState(() => readOpen(key) ?? !collapsed);

	const toggle = useCallback(() => {
		writeOpen(key, !open);
		setOpen(!open);
	}, [key, open]);

	return { open, toggle };
}

function readOpen(key: string): boolean | undefined {
	try {
		const stored = localStorage.getItem(key);
		return stored === null ? undefined : stored === "open";
	} catch {
		return undefined;
	}
}

function writeOpen(key: string, open: boolean): void {
	try {
		localStorage.setItem(key, open ? "open" : "closed");
	} catch {
		// ignore storage errors
	}
}
