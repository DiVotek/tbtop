import type { FieldConfig } from "../uploads/config";
import { allowsMime, sniffMime } from "../uploads/mime";

/* A `{url}` download over the host's fetchRemote: URL check, capped body, accepted type. */

/** The body and its sniffed type, or the error key; typed here so saveUsing() gets an accepted type too. */
export async function content(
	response: Response,
	config: FieldConfig,
): Promise<{ bytes: Uint8Array<ArrayBuffer>; type: string } | string> {
	const bytes = await body(response, config.maxSize);
	if (typeof bytes === "string") {
		return bytes;
	}
	const header = response.headers.get("content-type") ?? "";
	const type = sniffMime(bytes, header.split(";")[0]?.trim() ?? "");
	return allowsMime(type, config.accept) ? { bytes, type } : "mime_not_allowed";
}

export const httpUrl = (raw: string): URL | null => {
	const url = URL.canParse(raw) ? new URL(raw) : null;
	return url !== null && ["http:", "https:"].includes(url.protocol) ? url : null;
};

/** The response body, or the error key when it is over `maxSize`, empty or breaks off; read until the cap, no further. */
async function body(
	response: Response,
	maxSize: number,
): Promise<Uint8Array<ArrayBuffer> | string> {
	if (Number(response.headers.get("content-length") ?? 0) > maxSize) {
		await response.body?.cancel().catch(() => null);
		return "file_too_large";
	}
	const chunks = await readCapped(response, maxSize).catch(() => "download_failed");
	if (typeof chunks === "string") {
		return chunks;
	}
	if (chunks.length === 0) {
		return "download_failed";
	}
	const bytes = new Uint8Array(chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0));
	let offset = 0;
	for (const chunk of chunks) {
		bytes.set(chunk, offset);
		offset += chunk.byteLength;
	}
	return bytes;
}

/** The body's chunks, or "file_too_large" once they pass `maxSize` (the rest is never downloaded). */
async function readCapped(response: Response, maxSize: number): Promise<Uint8Array[] | string> {
	const reader = response.body?.getReader();
	const chunks: Uint8Array[] = [];
	let size = 0;
	for (let read = await reader?.read(); read && !read.done; read = await reader?.read()) {
		size += read.value.byteLength;
		if (size > maxSize) {
			await reader?.cancel();
			return "file_too_large";
		}
		chunks.push(read.value);
	}
	return chunks;
}
