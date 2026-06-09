export type ErrorCode =
	| "bad_request"
	| "not_found"
	| "method_not_allowed"
	| "conflict"
	| "validation"
	| "hook_error"
	| "unauthenticated"
	| "unauthorized"
	| "internal"
	| "network";

export interface TabletopError {
	code: ErrorCode;
	message: string;
	status: number;
	fields?: Record<string, string>;
}

export type Envelope<T> = { data: T | null; error: null } | { data: null; error: TabletopError };

interface ResponseErrorBody {
	error?: { code?: string; message?: string; fields?: Record<string, string> };
}

export async function decode<T>(response: Response): Promise<Envelope<T>> {
	if (response.status === 204) {
		return { data: null, error: null };
	}
	const body = await safeJson(response);
	if (response.ok) {
		const payload = unwrapData(body) as T;
		return { data: payload, error: null };
	}
	return { data: null, error: errorFromBody(body, response.status) };
}

export async function unwrap<T>(response: Response | Promise<Response>): Promise<T | null> {
	const result = await decode<T>(await response);
	if (result.error) {
		throw result.error;
	}
	return result.data;
}

export function unwrapData(body: unknown): unknown {
	if (typeof body !== "object" || body === null) {
		return body;
	}
	const obj = body as Record<string, unknown>;
	if ("data" in obj) {
		return obj.data;
	}
	return body;
}

export function errorFromBody(body: unknown, status: number): TabletopError {
	const parsed = body as ResponseErrorBody | null;
	const err = parsed?.error;
	return {
		code: (err?.code ?? "internal") as ErrorCode,
		message: err?.message ?? `HTTP ${status}`,
		status,
		fields: err?.fields,
	};
}

export function isTabletopError(err: unknown): err is TabletopError {
	if (!err || typeof err !== "object") {
		return false;
	}
	const obj = err as { code?: unknown; message?: unknown; status?: unknown };
	return (
		typeof obj.code === "string" &&
		typeof obj.message === "string" &&
		typeof obj.status === "number"
	);
}

async function safeJson(response: Response): Promise<unknown> {
	try {
		return await response.json();
	} catch {
		return null;
	}
}
