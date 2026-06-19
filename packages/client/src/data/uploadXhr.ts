/**
 * XHR upload transport — mirrors the fetch `request()` semantics for uploads,
 * adding progress events the fetch path cannot report. Reuses the same header
 * builder, CSRF/XSRF rules, 204→null mapping, and TabletopError envelope.
 */
import { errorFromBody, type TabletopError } from "./envelope";

export type XhrFactory = () => XMLHttpRequest;

export interface UploadViaXhrInput {
	xhrFactory: XhrFactory;
	url: string;
	formData: FormData;
	headers: Record<string, string>;
	signal?: AbortSignal;
	onProgress?: (loaded: number, total: number) => void;
}

export const defaultXhrFactory: XhrFactory = () => new XMLHttpRequest();

function safeParse(text: string): unknown {
	if (!text) {
		return null;
	}
	try {
		return JSON.parse(text);
	} catch {
		return null;
	}
}

// Mirrors request(): 204→null, parse body, errorFromBody on non-2xx.
function parseXhrResponse(xhr: XMLHttpRequest): unknown {
	if (xhr.status === 204) {
		return null;
	}
	const body = safeParse(xhr.responseText);
	if (xhr.status < 200 || xhr.status >= 300) {
		throw errorFromBody(body, xhr.status);
	}
	return body;
}

function networkError(): TabletopError {
	return { code: "network", message: "Network request failed", status: 0 };
}

function applyHeaders(xhr: XMLHttpRequest, headers: Record<string, string>): void {
	for (const [key, value] of Object.entries(headers)) {
		xhr.setRequestHeader(key, value);
	}
}

function bindProgress(xhr: XMLHttpRequest, onProgress: UploadViaXhrInput["onProgress"]): void {
	if (!onProgress) {
		return;
	}
	xhr.upload.addEventListener("progress", (e) => {
		if (e.lengthComputable) {
			onProgress(e.loaded, e.total);
		}
	});
}

export function uploadViaXhr(input: UploadViaXhrInput): Promise<unknown> {
	const { xhrFactory, url, formData, headers, signal, onProgress } = input;
	return new Promise((resolve, reject) => {
		const xhr = xhrFactory();
		xhr.open("POST", url);
		// ≡ credentials: "include"; matches the fetch path's "same-origin" only
		// because uploads are same-origin (cross-origin would diverge on cookies).
		xhr.withCredentials = true;
		applyHeaders(xhr, headers);
		bindProgress(xhr, onProgress);
		xhr.addEventListener("load", () => {
			try {
				resolve(parseXhrResponse(xhr));
			} catch (err) {
				reject(err);
			}
		});
		xhr.addEventListener("error", () => reject(networkError()));
		xhr.addEventListener("timeout", () => reject(networkError()));
		xhr.addEventListener("abort", () =>
			reject({ code: "network", message: "Upload aborted", status: 0 } as TabletopError),
		);
		if (signal) {
			signal.addEventListener("abort", () => xhr.abort());
		}
		xhr.send(formData);
	});
}
