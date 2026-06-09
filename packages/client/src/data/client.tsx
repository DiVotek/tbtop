import { createContext, type ReactNode, useContext, useMemo } from "react";
import { errorFromBody } from "./envelope";

export type QueryValue = string | number | boolean | null | undefined;

export type QueryParams = Record<string, QueryValue>;

export interface UploadOptions {
	signal?: AbortSignal;
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
}

export function createAdminClient(options: CreateAdminClientOptions = {}): AdminClient {
	const base = trimTrailingSlash(options.baseUrl ?? "");
	const impl = options.fetch ?? defaultFetch;
	return {
		get: (path, query) => request(impl, base, "GET", withQuery(path, query)),
		post: (path, body) => request(impl, base, "POST", path, { json: body }),
		patch: (path, body) => request(impl, base, "PATCH", path, { json: body }),
		delete: (path) => request(impl, base, "DELETE", path),
		upload: (path, formData, opts) =>
			request(impl, base, "POST", path, { formData, signal: opts?.signal }),
	};
}

export interface ClientProviderProps {
	baseUrl?: string;
	client?: AdminClient;
	fetch?: typeof fetch;
	children: ReactNode;
}

const ClientContext = createContext<AdminClient | null>(null);

export function ClientProvider({
	baseUrl,
	client,
	fetch: fetchImpl,
	children,
}: ClientProviderProps) {
	const resolved = useMemo<AdminClient>(
		() => client ?? createAdminClient({ baseUrl, fetch: fetchImpl }),
		[baseUrl, client, fetchImpl],
	);
	return <ClientContext.Provider value={resolved}>{children}</ClientContext.Provider>;
}

export function useClient(): AdminClient {
	const client = useContext(ClientContext);
	if (!client) {
		throw new Error("useClient must be used within a ClientProvider");
	}
	return client;
}

interface RequestPayload {
	json?: unknown;
	formData?: FormData;
	signal?: AbortSignal;
}

async function request(
	impl: typeof fetch,
	base: string,
	method: string,
	path: string,
	payload: RequestPayload = {},
): Promise<unknown> {
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
	}
	return headers;
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
