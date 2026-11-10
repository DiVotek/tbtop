import { errorFromBody } from "./envelope";

export interface DownloadedFile {
	blob: Blob;
	/** From Content-Disposition, when the server named the file. */
	filename?: string;
}

/**
 * GET a file endpoint. A failed response is JSON (Accept asks for it) and
 * throws the same TabletopError shape as the JSON client, so a 422's message
 * reaches the user as written by the server.
 */
export async function fetchDownload(impl: typeof fetch, url: string): Promise<DownloadedFile> {
	const res = await impl(url, {
		method: "GET",
		headers: { Accept: "application/json", "X-Requested-With": "XMLHttpRequest" },
		credentials: "same-origin",
	});
	if (!res.ok) {
		throw errorFromBody(await res.json().catch(() => null), res.status);
	}
	return {
		blob: await res.blob(),
		filename: filenameFrom(res.headers.get("Content-Disposition")),
	};
}

/** `filename*=UTF-8''…` wins over the ASCII `filename=` fallback (RFC 6266). */
export function filenameFrom(header: string | null): string | undefined {
	if (!header) {
		return undefined;
	}
	const extended = /filename\*=UTF-8''([^;]+)/i.exec(header);
	if (extended?.[1]) {
		try {
			return decodeURIComponent(extended[1]);
		} catch {
			// fall through to the plain name
		}
	}
	const plain = /filename="?([^";]+)"?/i.exec(header);
	return plain?.[1];
}

/** Hand a blob to the browser as a download. */
export function saveBlob(file: DownloadedFile, fallbackName: string): void {
	const url = URL.createObjectURL(file.blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = file.filename ?? fallbackName;
	document.body.append(a);
	a.click();
	a.remove();
	setTimeout(() => URL.revokeObjectURL(url), 0);
}
