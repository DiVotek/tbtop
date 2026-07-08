const NAV_COLLAPSE_KEY = "tbtop:nav-collapsed";

/**
 * Per-group collapse state, keyed by the group's stable key. Best-effort:
 * localStorage may be unavailable (private mode, SSR), in which case reads
 * return undefined and writes are skipped.
 */
function readAll(): Record<string, boolean> {
	if (typeof window === "undefined") {
		return {};
	}
	try {
		const raw = window.localStorage.getItem(NAV_COLLAPSE_KEY);
		return raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
	} catch {
		return {};
	}
}

/** The stored open/closed state for a group, or undefined when unset. */
export function readGroupExpanded(key: string): boolean | undefined {
	return readAll()[key];
}

/** Persist a group's open/closed state under its stable key. */
export function writeGroupExpanded(key: string, expanded: boolean): void {
	if (typeof window === "undefined") {
		return;
	}
	try {
		const all = readAll();
		all[key] = expanded;
		window.localStorage.setItem(NAV_COLLAPSE_KEY, JSON.stringify(all));
	} catch {
		// Persistence is best-effort; ignore storage failures.
	}
}
