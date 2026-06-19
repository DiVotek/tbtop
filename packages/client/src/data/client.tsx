import { createContext, type ReactNode, useContext, useMemo } from "react";
import { errorFromBody } from "./envelope";
import { defaultXhrFactory, uploadViaXhr, type XhrFactory } from "./uploadXhr";

export type QueryValue = string | number | boolean | null | undefined;

export type QueryParams = Record<string, QueryValue>;

export interface UploadOptions {
	signal?: AbortSignal;
	onProgress?: (loaded: number, total: number) => void;
}

// Thin untyped JSON client over the Laravel admin API. Errors decode to the
// TabletopError envelope shape and are thrown; success bodies return as-is.
export interface AdminClient {
	get(path: string, query?: QueryParams): Promise<unknown>;
	post(path: string, body?: unknown): Promise<unknown>;
	patch(path: string, body?: unknown): Promise<unknown>;
	delete(path: string): Promise<unknown>;
	upload(path: string, formData: FormData, opts?: UploadOptions): Promise<unknown>;
}

export interface CreateAdminClientOptions {
	baseUrl?: string;
	fetch?: typeof fetch;
	/** Factory for the upload transport; injectable for tests. */
	xhr?: XhrFactory;
}

export function createAdminClient(options: CreateAdminClientOptions = {}): AdminClient {
	const base = trimTrailingSlash(options.baseUrl ?? "");
	const impl = options.fetch ?? defaultFetch;
	const xhrFactory = options.xhr ?? defaultXhrFactory;
	return {
		get: (path, query) => request({ impl, base, method: "GET", path: withQuery(path, query) }),
		post: (path, body) =>
			request({ impl, base, method: "POST", path, payload: { json: body } }),
		patch: (path, body) =>
			request({ impl, base, method: "PATCH", path, payload: { json: body } }),
		delete: (path) => request({ impl, base, method: "DELETE", path }),
		upload: (path, formData, opts) =>
			uploadViaXhr({
				xhrFactory,
				url: `${base}${path}`,
				formData,
				headers: buildHeaders({ formData }),
				signal: opts?.signal,
				onProgress: opts?.onProgress,
			}),
	};
}

export interface ClientProviderProps {
	baseUrl?: string;
	/**
	 * Admin API base (e.g. "/admin/api") for modules that build their own
	 * paths (media). NOT applied to client requests — consumers like
	 * tables/charts pass already-absolute paths, a global base would
	 * double-prefix them (regression: media 404 fix broke table queries).
	 */
	apiBase?: string;
	client?: AdminClient;
	fetch?: typeof fetch;
	/** Upload transport factory; injectable for tests. */
	xhr?: XhrFactory;
	children: ReactNode;
}

const ClientContext = createContext<AdminClient | null>(null);
const ApiBaseContext = createContext<string>("");

export function ClientProvider({
	baseUrl,
	apiBase = "",
	client,
	fetch: fetchImpl,
	xhr,
	children,
}: ClientProviderProps) {
	const resolved = useMemo<AdminClient>(
		() => client ?? createAdminClient({ baseUrl, fetch: fetchImpl, xhr }),
		[baseUrl, client, fetchImpl, xhr],
	);
	return (
		<ClientContext.Provider value={resolved}>
			<ApiBaseContext.Provider value={apiBase}>{children}</ApiBaseContext.Provider>
		</ClientContext.Provider>
	);
}

export function useClient(): AdminClient {
	const client = useContext(ClientContext);
	if (!client) {
		throw new Error("useClient must be used within a ClientProvider");
	}
	return client;
}

export function useApiBase(): string {
	return useContext(ApiBaseContext);
}

interface RequestPayload {
	json?: unknown;
	formData?: FormData;
	signal?: AbortSignal;
}

interface RequestInput {
	impl: typeof fetch;
	base: string;
	method: string;
	path: string;
	payload?: RequestPayload;
}

async function request({ impl, base, method, path, payload = {} }: RequestInput): Promise<unknown> {
	const res = await impl(`${base}${path}`, {
		method,
		headers: buildHeaders(payload),
		body: buildBody(payload),
		credentials: "same-origin",
		signal: payload.signal,
	});
	if (res.status === 204) {
		return null;
	}
	const body = await safeJson(res);
	if (!res.ok) {
		throw errorFromBody(body, res.status);
	}
	return body;
}

function buildHeaders(payload: RequestPayload): Record<string, string> {
	const headers: Record<string, string> = {
		Accept: "application/json",
		"X-Requested-With": "XMLHttpRequest",
	};
	if (payload.json !== undefined) {
		headers["Content-Type"] = "application/json";
	}
	const csrf = csrfToken();
	if (csrf) {
		headers["X-CSRF-TOKEN"] = csrf;
	} else {
		const xsrf = xsrfCookie();
		if (xsrf) {
			headers["X-XSRF-TOKEN"] = xsrf;
		}
	}
	return headers;
}

// Fallback: Laravel always issues an XSRF-TOKEN cookie and accepts
// it back via X-XSRF-TOKEN when no csrf-token meta is in the layout.
function xsrfCookie(): string | null {
	if (typeof document === "undefined") {
		return null;
	}
	const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/);
	return match?.[1] ? decodeURIComponent(match[1]) : null;
}

function buildBody(payload: RequestPayload): BodyInit | undefined {
	if (payload.formData) {
		return payload.formData;
	}
	if (payload.json !== undefined) {
		return JSON.stringify(payload.json);
	}
	return undefined;
}

// Laravel convention: <meta name="csrf-token" content="..."> in the layout head.
function csrfToken(): string | null {
	if (typeof document === "undefined") {
		return null;
	}
	return document.querySelector('meta[name="csrf-token"]')?.getAttribute("content") ?? null;
}

function withQuery(path: string, query: QueryParams | undefined): string {
	if (!query) {
		return path;
	}
	const params = new URLSearchParams();
	for (const [key, value] of Object.entries(query)) {
		if (value !== undefined && value !== null) {
			params.set(key, String(value));
		}
	}
	const qs = params.toString();
	if (qs.length === 0) {
		return path;
	}
	return `${path}${path.includes("?") ? "&" : "?"}${qs}`;
}

function trimTrailingSlash(url: string): string {
	return url.endsWith("/") ? url.slice(0, -1) : url;
}

// Bound wrapper: a bare `fetch` reference loses its window binding in browsers.
const defaultFetch = ((input: RequestInfo | URL, init?: RequestInit) =>
	globalThis.fetch(input, init)) as typeof fetch;

async function safeJson(response: Response): Promise<unknown> {
	try {
		return await response.json();
	} catch {
		return null;
	}
}
