/**
 * Open/closed state of collapsible row groups. With a storage key the state
 * is persisted per table to localStorage, so a reload keeps the groups the
 * user opened or closed; groups(..., collapsed: true) only seeds groups the
 * user has never toggled.
 */
import { useState } from "react";

/** Groups remembered per table; the oldest toggles drop off past this. */
const MAX_REMEMBERED = 200;

/** Stable key for a group value, so collapse state survives a refetch or page change. */
export function groupKey(value: unknown): string {
	return value === undefined ? "undefined" : JSON.stringify(value);
}

export interface GroupCollapse {
	isCollapsed: (value: unknown) => boolean;
	toggle: (value: unknown) => void;
}

/** Group key → collapsed, for the groups the user toggled, oldest toggle first. */
type CollapseState = ReadonlyMap<string, boolean>;

const EMPTY: CollapseState = new Map();

/**
 * Explicit per-group state wins; a group never toggled (or arriving later on
 * another page) opens in the declared default.
 */
export function useGroupCollapse(collapsedByDefault: boolean, storageKey?: string): GroupCollapse {
	// This tab's toggles, tagged with their key: they still apply when storage is unavailable.
	const [memory, setMemory] = useState<{ key?: string; state: CollapseState }>({ state: EMPTY });
	const own = memory.key === storageKey ? memory.state : EMPTY;
	const stored = storageKey ? readState(storageKey) : EMPTY;
	const isCollapsed = (value: unknown): boolean => {
		const key = groupKey(value);
		return own.get(key) ?? stored.get(key) ?? collapsedByDefault;
	};
	return {
		isCollapsed,
		toggle: (value) => {
			const key = groupKey(value);
			const collapsed = !isCollapsed(value);
			if (storageKey) {
				// Merge into what storage holds now, so another tab's toggles are kept.
				writeState(storageKey, remember(readState(storageKey), key, collapsed));
			}
			setMemory({ key: storageKey, state: remember(own, key, collapsed) });
		},
	};
}

/**
 * Re-inserts `key` last so the cap drops the least recently toggled group.
 * A Map keeps insertion order even for integer-like keys, which an object does not.
 */
function remember(state: CollapseState, key: string, collapsed: boolean): CollapseState {
	const entries = [...state].filter(([k]) => k !== key);
	entries.push([key, collapsed]);
	return new Map(entries.slice(-MAX_REMEMBERED));
}

/** Stored as an array of [groupKey, collapsed] pairs, oldest toggle first. */
function readState(key: string): CollapseState {
	try {
		const parsed: unknown = JSON.parse(localStorage.getItem(key) ?? "[]");
		if (!Array.isArray(parsed)) {
			return EMPTY;
		}
		return new Map(parsed.filter(isEntry));
	} catch {
		return EMPTY;
	}
}

function isEntry(entry: unknown): entry is [string, boolean] {
	return (
		Array.isArray(entry) &&
		entry.length === 2 &&
		typeof entry[0] === "string" &&
		typeof entry[1] === "boolean"
	);
}

function writeState(key: string, state: CollapseState): void {
	try {
		localStorage.setItem(key, JSON.stringify([...state]));
	} catch {
		// ignore storage errors
	}
}
