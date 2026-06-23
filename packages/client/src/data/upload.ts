import type { AdminClient } from "./client";
import { uploadPath } from "./entityRoutes";
import { type Envelope, isTabletopError, type TabletopError, unwrapData } from "./envelope";

export interface UploadFileInput {
	client: AdminClient;
	entityName: string;
	file: File;
	signal?: AbortSignal;
}

export interface UploadRow {
	id: string;
	path: string;
	filename: string;
	mimeType: string;
	filesize: number;
	url: string;
	width: number | null;
	height: number | null;
	sizes: Array<{
		name: string;
		filename: string;
		url: string;
		width: number;
		height: number;
		mimeType: string;
		filesize: number;
	}>;
}

export async function uploadFile(input: UploadFileInput): Promise<Envelope<UploadRow>> {
	const body = new FormData();
	body.append("file", input.file);
	try {
		const raw = await input.client.upload(uploadPath(input.entityName), body, {
			signal: input.signal,
		});
		return { data: unwrapData(raw) as UploadRow, error: null };
	} catch (err) {
		return { data: null, error: toUploadError(err) };
	}
}

function toUploadError(err: unknown): TabletopError {
	if (isTabletopError(err)) {
		return err;
	}
	const message = err instanceof Error ? err.message : String(err);
	return { code: "network", message, status: 0 };
}
