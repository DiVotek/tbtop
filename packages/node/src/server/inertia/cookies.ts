export function readCookie(request: Request, name: string): string | null {
	for (const part of (request.headers.get("cookie") ?? "").split(";")) {
		const [key, ...value] = part.trim().split("=");
		if (key === name) {
			return decoded(value.join("="));
		}
	}
	return null;
}

/** A malformed escape (`%E0`) is no cookie, not a 500. */
function decoded(value: string): string | null {
	try {
		return decodeURIComponent(value);
	} catch {
		return null;
	}
}

export function withCookie(response: Response, line: string): Response {
	const copy = new Response(response.body, response);
	copy.headers.append("set-cookie", line);
	return copy;
}

/** `Path=…; HttpOnly; SameSite=Lax[; Secure]`, shared by both session stores. */
export function cookieAttributes(options: { path?: string; secure?: boolean }): string {
	const secure = options.secure === true ? "; Secure" : "";
	return `Path=${options.path ?? "/"}; HttpOnly; SameSite=Lax${secure}`;
}
