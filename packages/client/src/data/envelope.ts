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
	/** Laravel's native validation-exception JSON shape ({message, errors}) — thrown
	 * uncaught from an action/form handler, with no custom envelope wrapping. */
	message?: string;
	errors?: Record<string, string | string[]>;
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
	return {
		code: errorCode(parsed, status),
		message: parsed?.error?.message ?? parsed?.message ?? `HTTP ${status}`,
		status,
		fields: parsed?.error?.fields ?? flattenLaravelErrors(parsed?.errors),
	};
}

/** The custom envelope's code wins; otherwise infer "validation" from a 422,
 * the one native-Laravel-JSON status this client special-cases. */
function errorCode(parsed: ResponseErrorBody | null, status: number): ErrorCode {
	if (parsed?.error?.code) {
		return parsed.error.code as ErrorCode;
	}
	return status === 422 ? "validation" : "internal";
}

/**
 * Normalises Laravel's native validation-exception JSON ({message, errors:
 * {field: [msg, ...]}}) into the flat {field: msg} shape the client's
 * setFieldError expects. Produced whenever a ValidationException bubbles
 * uncaught from an action/form handler with no custom envelope wrapping
 * (e.g. ActionController, SelectCreateController, EditableColumnController).
 */
function flattenLaravelErrors(
	errors: Record<string, string | string[]> | undefined,
): Record<string, string> | undefined {
	if (!errors || typeof errors !== "object") {
		return undefined;
	}
	const flat: Record<string, string> = {};
	for (const [field, message] of Object.entries(errors)) {
		flat[field] = Array.isArray(message) ? (message[0] ?? "") : message;
	}
	return Object.keys(flat).length === 0 ? undefined : flat;
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
