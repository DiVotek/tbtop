/**
 * Non-hook media API helpers — upload, import, patch, replace, delete, fetch,
 * folder CRUD — plus pure utilities shared across media components.
 */
import type { useClient } from "../data/client";
import type { MediaFolder, MediaItem } from "./types";

// ─── API helpers (non-hook) ────────────────────────────────────────────────────

interface UploadItemInput {
	file: File;
	folderId: string | null;
	onProgress?: (loaded: number, total: number) => void;
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
	return (await client.upload("/media/upload", fd, {
		onProgress: input.onProgress,
	})) as MediaItem;
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
	if (input.name) {
		body.name = input.name;
	}
	if (input.folderId !== null) {
		body.folderId = input.folderId;
	}
	return (await client.post("/media/import-url", body)) as MediaItem;
}

interface PatchItemInput {
	name?: string;
	alt?: string;
	description?: string | null;
	tags?: string[];
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
	if (parentId !== null) {
		body.parentId = parentId;
	}
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

export function extractMessage(err: unknown): string {
	if (err instanceof Error) {
		return err.message;
	}
	if (typeof err === "string") {
		return err;
	}
	return "Request failed";
}

export function formatBytes(bytes: number): string {
	if (bytes < 1024) {
		return `${bytes} B`;
	}
	if (bytes < 1024 * 1024) {
		return `${(bytes / 1024).toFixed(1)} KB`;
	}
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function isImageMime(mime: string): boolean {
	return mime.startsWith("image/");
}
