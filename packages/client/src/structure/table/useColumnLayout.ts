/**
 * Column-layout state for a table: the user's column order and dragged
 * widths, persisted to localStorage next to the visibility state. Columns the
 * saved order doesn't know (added since) go to the end in declared order.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { storageKey } from "../../app/storageKey";
import type { TableColumn } from "../types";

export interface ColumnLayoutState {
	order: string[];
	/** Pixel widths of columns the user resized, keyed by column name. */
	widths: Record<string, number>;
}

export interface ColumnLayout {
	/** All columns, in the user's order. */
	orderedColumns: TableColumn[];
	widths: Record<string, number>;
	/** Moves `name` to the slot `target` holds now. */
	moveColumn: (name: string, target: string) => void;
	/** Sets a column's width; `undefined` drops it back to the declared width. */
	setWidth: (name: string, width: number | undefined) => void;
	resetLayout: () => void;
	/** True once the user changed the order or any width. */
	customized: boolean;
}

/** Narrowest a column can be dragged to, in px. */
export const MIN_COLUMN_WIDTH = 48;

const EMPTY: ColumnLayoutState = { order: [], widths: {} };

/**
 * Storage key for one table's state. Unnamed tables fall back to a col-join so
 * their state stays distinct from other tables on the page.
 */
export function tableStateKey(
	columns: TableColumn[],
	tableName: string,
	...path: string[]
): string {
	const id = tableName || columns.map((c) => c.name).join("-");
	return storageKey("table", id, ...path);
}

export function applyColumnOrder(columns: TableColumn[], order: string[]): TableColumn[] {
	const byName = new Map(columns.map((c) => [c.name, c]));
	const ordered = order.flatMap((name) => byName.get(name) ?? []);
	const placed = new Set(ordered.map((c) => c.name));
	return [...ordered, ...columns.filter((c) => !placed.has(c.name))];
}

export function moveInOrder(names: string[], name: string, target: string): string[] {
	const from = names.indexOf(name);
	const to = names.indexOf(target);
	if (from === -1 || to === -1 || from === to) {
		return names;
	}
	const next = [...names];
	next.splice(from, 1);
	next.splice(to, 0, name);
	return next;
}

function isWidths(value: unknown): value is Record<string, number> {
	if (typeof value !== "object" || value === null || Array.isArray(value)) {
		return false;
	}
	return Object.values(value).every((w) => typeof w === "number" && Number.isFinite(w));
}

function parseLayout(value: unknown): ColumnLayoutState {
	if (typeof value !== "object" || value === null) {
		return EMPTY;
	}
	const { order, widths } = value as Record<string, unknown>;
	return {
		order: Array.isArray(order) ? order.filter((n): n is string => typeof n === "string") : [],
		widths: isWidths(widths) ? widths : {},
	};
}

function readLayout(key: string): ColumnLayoutState {
	try {
		const stored = localStorage.getItem(key);
		return stored ? parseLayout(JSON.parse(stored)) : EMPTY;
	} catch {
		return EMPTY;
	}
}

function writeLayout(key: string, layout: ColumnLayoutState): void {
	try {
		if (layout.order.length === 0 && Object.keys(layout.widths).length === 0) {
			localStorage.removeItem(key);
			return;
		}
		localStorage.setItem(key, JSON.stringify(layout));
	} catch {
		// ignore storage errors
	}
}

function withWidth(
	widths: Record<string, number>,
	name: string,
	width: number | undefined,
): Record<string, number> {
	const { [name]: _dropped, ...rest } = widths;
	if (width === undefined) {
		return rest;
	}
	return { ...rest, [name]: Math.max(MIN_COLUMN_WIDTH, Math.round(width)) };
}

type UpdateLayout = (change: (prev: ColumnLayoutState) => ColumnLayoutState) => void;

/** The stored layout under `key`, plus an updater that writes every change back. */
function useStoredLayout(key: string): [ColumnLayoutState, UpdateLayout] {
	const [layout, setLayout] = useState<ColumnLayoutState>(() => readLayout(key));

	useEffect(() => {
		setLayout(readLayout(key));
	}, [key]);

	const update = useCallback<UpdateLayout>(
		(change) => {
			setLayout((prev) => {
				const next = change(prev);
				writeLayout(key, next);
				return next;
			});
		},
		[key],
	);

	return [layout, update];
}

export function useColumnLayout(columns: TableColumn[], tableName: string): ColumnLayout {
	const [layout, update] = useStoredLayout(tableStateKey(columns, tableName, "layout", "v1"));

	const orderedColumns = useMemo(
		() => applyColumnOrder(columns, layout.order),
		[columns, layout.order],
	);

	const moveColumn = useCallback(
		(name: string, target: string) => {
			update((prev) => {
				const names = applyColumnOrder(columns, prev.order).map((c) => c.name);
				return { ...prev, order: moveInOrder(names, name, target) };
			});
		},
		[columns, update],
	);

	const setWidth = useCallback(
		(name: string, width: number | undefined) => {
			update((prev) => ({ ...prev, widths: withWidth(prev.widths, name, width) }));
		},
		[update],
	);

	const resetLayout = useCallback(() => update(() => EMPTY), [update]);

	return {
		orderedColumns,
		widths: layout.widths,
		moveColumn,
		setWidth,
		resetLayout,
		customized: layout.order.length > 0 || Object.keys(layout.widths).length > 0,
	};
}
