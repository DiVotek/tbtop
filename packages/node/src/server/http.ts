import { Effects } from "../dsl";

export type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

/** An error the endpoint layer answers with its status (abort() in Laravel). */
export class HttpError extends Error {
	constructor(
		readonly status: number,
		message: string,
		readonly body: Record<string, unknown> = {},
	) {
		super(message);
	}
}

export const notFound = (message: string) => new HttpError(404, message);
export const unprocessable = (message: string) => new HttpError(422, message);

export function json(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { "content-type": "application/json" },
	});
}

/** Drops undefined and anything non-JSON: what crosses the wire is plain data. */
export function asJson<T>(value: unknown): T {
	return JSON.parse(JSON.stringify(value)) as T;
}

export function errorResponse(error: unknown): Response {
	if (error instanceof HttpError) {
		return json({ message: error.message, ...error.body }, error.status);
	}
	if (error instanceof Response) {
		return error;
	}
	throw error;
}

/** Laravel's 422 body for a failed validation. */
export function invalid(errors: Record<string, string[]>): HttpError {
	return new HttpError(422, "The given data was invalid.", { errors });
}

export async function readBody(request: Request): Promise<Record<string, unknown>> {
	const body: unknown = await request.json().catch(() => ({}));
	return body !== null && typeof body === "object" && !Array.isArray(body)
		? (body as Record<string, unknown>)
		: {};
}

export function effectsBody(result: unknown, fallback: Effects): { effects: unknown } {
	return { effects: result instanceof Effects ? result : fallback };
}

export function stripPrefix(pathname: string, prefix: string): string | null {
	if (pathname !== prefix && !pathname.startsWith(`${prefix}/`)) {
		return null;
	}
	return pathname.slice(prefix.length).replaceAll(/^\/+|\/+$/g, "");
}

/** PHP-style query parsing: `filters[status][]=a` → `{ filters: { status: ["a"] } }`. */
export function phpQuery(params: URLSearchParams): Record<string, unknown> {
	const out: Record<string, unknown> = {};
	for (const [raw, value] of params) {
		const [head = raw, ...rest] = raw.split("[").map((part) => part.replace(/\]$/, ""));
		assign(out, [head, ...rest], value);
	}
	return out;
}

function assign(target: Record<string, unknown>, path: string[], value: string): void {
	const [key = "", ...rest] = path;
	if (rest.length === 0) {
		target[key] = value;
		return;
	}
	const next = rest[0] === "" ? [] : {};
	const container = (target[key] ??= next) as Record<string, unknown> | unknown[];
	if (Array.isArray(container)) {
		container.push(rest.length === 1 ? value : {});
		return;
	}
	assign(container, rest, value);
}
