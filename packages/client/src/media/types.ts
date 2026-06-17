import type { LucideIcon } from "lucide-react";

export interface MediaItem {
	id: string;
	name: string;
	folderId: string | null;
	mime: string;
	size: number;
	url: string;
	sizes: Record<string, string>;
	alt: string | null;
	description: string | null;
	tags: string[];
	createdAt: string;
}

/** Broad category a file falls into, resolved from its mime/extension. */
export type FileKind =
	| "image"
	| "pdf"
	| "word"
	| "excel"
	| "archive"
	| "audio"
	| "video"
	| "text"
	| "generic";

/** Display metadata for a file kind: icon, color, and short extension label. */
export interface FileTypeInfo {
	kind: FileKind;
	Icon: LucideIcon;
	colorClass: string;
	ext: string;
}

export interface MediaFolder {
	id: string;
	name: string;
	parentId: string | null;
}

/** A single file in the sequential upload queue, with its live status. */
export type UploadTaskStatus = "pending" | "uploading" | "done" | "error";

export interface UploadTask {
	id: string;
	name: string;
	status: UploadTaskStatus;
	pct: number;
}

export interface MediaListResponse {
	data: MediaItem[];
	/** Child folders of the current level. Optional: older payloads omit it. */
	folders?: MediaFolder[];
	total: number;
	page: number;
	perPage: number;
}
