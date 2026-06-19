import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useApiBase, useClient } from "../data/client";
import { extractMessage } from "./mediaApiHelpers";
import type { MediaFolder, MediaListResponse } from "./types";

export {
	createFolder,
	deleteFolder,
	deleteMediaItem,
	fetchMediaItem,
	formatBytes,
	importMediaUrl,
	isImageMime,
	patchMediaItem,
	renameFolder,
	replaceMediaItem,
	uploadMediaItem,
} from "./mediaApiHelpers";

/**
 * Media endpoints live under `{apiBase}/media/*` — wrap the neutral admin
 * client so every media path gets the prefix. The base client stays
 * prefix-free: tables/charts pass absolute paths and a global base would
 * double-prefix them.
 */
export function useMediaClient(): ReturnType<typeof useClient> {
	const client = useClient();
	const apiBase = useApiBase();
	return useMemo(
		() => ({
			get: (path, query) => client.get(`${apiBase}${path}`, query),
			post: (path, body) => client.post(`${apiBase}${path}`, body),
			patch: (path, body) => client.patch(`${apiBase}${path}`, body),
			delete: (path) => client.delete(`${apiBase}${path}`),
			upload: (path, formData, opts) => client.upload(`${apiBase}${path}`, formData, opts),
		}),
		[client, apiBase],
	);
}

// ─── State ────────────────────────────────────────────────────────────────────

export type MediaQueryState =
	| { kind: "loading" }
	| { kind: "loaded"; data: MediaListResponse }
	| { kind: "reloading"; data: MediaListResponse }
	| { kind: "error"; message: string };

export type MediaSortColumn = "name" | "size" | "created_at";
export type MediaSortDir = "asc" | "desc";

export interface MediaQueryParams {
	folder: string | null;
	search: string;
	page: number;
	perPage: number;
	sort?: MediaSortColumn;
	dir?: MediaSortDir;
}

// ─── Query building ───────────────────────────────────────────────────────────

/** Serialize media query params into a sparse request query object. */
function buildMediaQuery(p: MediaQueryParams): Record<string, string> {
	const query: Record<string, string | number> = { page: p.page, perPage: p.perPage };
	if (p.folder !== null) {
		query.folder = p.folder;
	}
	if (p.search) {
		query.search = p.search;
	}
	if (p.sort) {
		query.sort = p.sort;
	}
	if (p.dir) {
		query.dir = p.dir;
	}
	return query as Record<string, string>;
}

// ─── useMediaItems ────────────────────────────────────────────────────────────

export function useMediaItems(params: MediaQueryParams): {
	state: MediaQueryState;
	refetch: () => void;
} {
	const client = useMediaClient();
	const [tick, setTick] = useState(0);
	const [state, setState] = useState<MediaQueryState>({ kind: "loading" });

	const refetch = useCallback(() => setTick((t) => t + 1), []);

	const paramsRef = useRef(params);
	paramsRef.current = params;

	useEffect(() => {
		let cancelled = false;
		setState((prev) => {
			if (prev.kind === "loaded" || prev.kind === "reloading") {
				return { kind: "reloading", data: prev.data };
			}
			return { kind: "loading" };
		});
		const query = buildMediaQuery(paramsRef.current);

		client.get("/media", query).then(
			(raw) => {
				if (!cancelled) {
					setState({ kind: "loaded", data: raw as MediaListResponse });
				}
			},
			(err: unknown) => {
				if (!cancelled) {
					setState({ kind: "error", message: extractMessage(err) });
				}
			},
		);
		return () => {
			cancelled = true;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [
		client,
		tick,
		params.folder,
		params.search,
		params.page,
		params.perPage,
		params.sort,
		params.dir,
	]);

	return { state, refetch };
}

// ─── useMediaFolders ──────────────────────────────────────────────────────────

export function useMediaFolders(): {
	folders: MediaFolder[];
	loading: boolean;
	refetch: () => void;
} {
	const client = useMediaClient();
	const [tick, setTick] = useState(0);
	const [folders, setFolders] = useState<MediaFolder[]>([]);
	const [loading, setLoading] = useState(true);

	const refetch = useCallback(() => setTick((t) => t + 1), []);

	useEffect(() => {
		let cancelled = false;
		setLoading(true);
		client.get("/media/folders").then(
			(raw) => {
				if (!cancelled) {
					setFolders(raw as MediaFolder[]);
					setLoading(false);
				}
			},
			() => {
				if (!cancelled) {
					setLoading(false);
				}
			},
		);
		return () => {
			cancelled = true;
		};
	}, [client, tick]);

	return { folders, loading, refetch };
}
