import type { ZodError } from "zod";

export type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

export function json(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { "content-type": "application/json" },
	});
}

/** Drops undefined and anything non-JSON: what crosses the wire is plain data. */
export function asJson<T extends { [key: string]: Json }>(value: unknown): T {
	return JSON.parse(JSON.stringify(value)) as T;
}

/** Laravel's ConvertEmptyStringsToNull, so `required` means the same on both stacks. */
export function emptyToNull(value: unknown): unknown {
	if (value === "") {
		return null;
	}
	if (Array.isArray(value)) {
		return value.map(emptyToNull);
	}
	if (value !== null && typeof value === "object") {
		return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, emptyToNull(v)]));
	}
	return value;
}

/** Laravel's `{field: [message]}` bag, which the client already understands. */
export function laravelErrors(error: ZodError): Record<string, string[]> {
	const bag: Record<string, string[]> = {};
	for (const issue of error.issues) {
		const key = issue.path.join(".");
		bag[key] = [...(bag[key] ?? []), issue.message];
	}
	return bag;
}

export function stripPrefix(pathname: string, prefix: string): string | null {
	if (pathname !== prefix && !pathname.startsWith(`${prefix}/`)) {
		return null;
	}
	return pathname.slice(prefix.length).replaceAll(/^\/+|\/+$/g, "");
}
