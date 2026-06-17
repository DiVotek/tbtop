/**
 * useViewMode — grid/list toggle state for the media library, persisted to
 * localStorage. Guarded for SSR / restricted-storage environments.
 */
import { useCallback, useState } from "react";

export type MediaViewMode = "grid" | "list";

const STORAGE_KEY = "tbtop.media.view";

function readStored(): MediaViewMode {
	try {
		if (typeof window === "undefined") {
			return "grid";
		}
		return window.localStorage.getItem(STORAGE_KEY) === "list" ? "list" : "grid";
	} catch {
		return "grid";
	}
}

function writeStored(view: MediaViewMode): void {
	try {
		if (typeof window !== "undefined") {
			window.localStorage.setItem(STORAGE_KEY, view);
		}
	} catch {
		// storage unavailable — keep in-memory state only
	}
}

export function useViewMode(): {
	view: MediaViewMode;
	setView: (view: MediaViewMode) => void;
} {
	const [view, setViewState] = useState<MediaViewMode>(readStored);

	const setView = useCallback((next: MediaViewMode) => {
		setViewState(next);
		writeStored(next);
	}, []);

	return { view, setView };
}
