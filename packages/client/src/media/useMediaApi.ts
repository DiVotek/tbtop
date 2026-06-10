import { useCallback, useEffect, useRef, useState } from "react";
import { useClient } from "../data/client";
import type { MediaFolder, MediaItem, MediaListResponse } from "./types";

// ─── State ────────────────────────────────────────────────────────────────────

export type MediaQueryState =
	| { kind: "loading" }
	| { kind: "loaded"; data: MediaListResponse }
	| { kind: "reloading"; data: MediaListResponse }
	| { kind: "error"; message: string };

export interface MediaQueryParams {
	folder: string | null;
	search: string;
	page: number;
	perPage: number;
}

// ─── useMediaItems ────────────────────────────────────────────────────────────

export function useMediaItems(params: MediaQueryParams): {
	state: MediaQueryState;
	refetch: () => void;
} {
	const client = useClient();
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
		const p = paramsRef.current;
		const query: Record<string, string | number> = {
			page: p.page,
			perPage: p.perPage,
		};
		if (p.folder !== null) query.folder = p.folder;
		if (p.search) query.search = p.search;

		client.get("/media", query as Record<string, string>).then(
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
	}, [client, tick, params.folder, params.search, params.page, params.perPage]);

	return { state, refetch };
}

// ─── useMediaFolders ──────────────────────────────────────────────────────────

export function useMediaFolders(): {
	folders: MediaFolder[];
	loading: boolean;
	refetch: () => void;
} {
	const client = useClient();
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

// ─── API helpers (non-hook) ────────────────────────────────────────────────────

interface UploadItemInput {
	file: File;
	folderId: string | null;
}

export async function uploadMediaItem(
	client: ReturnType<typeof useClient>,
	input: UploadItemInput,
): Promise<MediaItem> {
	const fd = new FormData();
	fd.append("file", input.file);
	if (input.folderId !== null) {
		fd.append("folderId", input.folderId);
	}
	return (await client.upload("/media/upload", fd)) as MediaItem;
}

interface ImportUrlInput {
	url: string;
	name?: string;
	folderId: string | null;
}

export async function importMediaUrl(
	client: ReturnType<typeof useClient>,
	input: ImportUrlInput,
): Promise<MediaItem> {
	const body: Record<string, string> = { url: input.url };
	if (input.name) body.name = input.name;
	if (input.folderId !== null) body.folderId = input.folderId;
	return (await client.post("/media/import-url", body)) as MediaItem;
}

interface PatchItemInput {
	name?: string;
	alt?: string;
	folderId?: string | null;
}

export async function patchMediaItem(
	client: ReturnType<typeof useClient>,
	id: string,
	patch: PatchItemInput,
): Promise<MediaItem> {
	return (await client.patch(`/media/${id}`, patch)) as MediaItem;
}

export async function replaceMediaItem(
	client: ReturnType<typeof useClient>,
	id: string,
	file: File,
): Promise<MediaItem> {
	const fd = new FormData();
	fd.append("file", file);
	return (await client.upload(`/media/${id}/replace`, fd)) as MediaItem;
}

export async function deleteMediaItem(
	client: ReturnType<typeof useClient>,
	id: string,
): Promise<void> {
	await client.delete(`/media/${id}`);
}

export async function fetchMediaItem(
	client: ReturnType<typeof useClient>,
	id: string,
): Promise<MediaItem> {
	return (await client.get(`/media/${id}`)) as MediaItem;
}

export async function createFolder(
	client: ReturnType<typeof useClient>,
	name: string,
	parentId: string | null,
): Promise<MediaFolder> {
	const body: Record<string, string> = { name };
	if (parentId !== null) body.parentId = parentId;
	return (await client.post("/media/folders", body)) as MediaFolder;
}

export async function renameFolder(
	client: ReturnType<typeof useClient>,
	id: string,
	name: string,
): Promise<MediaFolder> {
	return (await client.patch(`/media/folders/${id}`, { name })) as MediaFolder;
}

export async function deleteFolder(
	client: ReturnType<typeof useClient>,
	id: string,
): Promise<void> {
	await client.delete(`/media/folders/${id}`);
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function extractMessage(err: unknown): string {
	if (err instanceof Error) return err.message;
	if (typeof err === "string") return err;
	return "Request failed";
}

export function formatBytes(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function isImageMime(mime: string): boolean {
	return mime.startsWith("image/");
}
