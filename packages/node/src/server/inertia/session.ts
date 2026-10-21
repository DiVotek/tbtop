/**
 * The admin's only view of the host's session: put and read the user, the
 * flashed effects and the validation errors. Cookie-based or store-backed,
 * signed or not, is the host's choice.
 */
export interface SessionStore {
	get(key: string): unknown;
	set(key: string, value: unknown): void | Promise<void>;
	forget(key: string): void | Promise<void>;
	/** Runs on every response the admin answers: a cookie session attaches its Set-Cookie here. */
	commit?(response: Response): Response | Promise<Response>;
}

export type SessionResolver = (request: Request) => SessionStore | Promise<SessionStore>;

/** The key the default `user` resolver reads; a host login page sets it. */
export const SESSION_USER = "user";

/** Reads once: Laravel's flash semantics for errors and effects. */
export async function pull(session: SessionStore, key: string): Promise<unknown> {
	const value = await session.get(key);
	if (value !== undefined) {
		await session.forget(key);
	}
	return value;
}

export interface MemorySessionOptions {
	cookie?: string;
	secure?: boolean;
}

/**
 * An in-process session keyed by a random cookie id: enough for one server and
 * for tests. Multi-instance hosts pass their own store.
 */
export function memorySessions(options: MemorySessionOptions = {}): SessionResolver {
	const name = options.cookie ?? "tbtop_session";
	const stores = new Map<string, Map<string, unknown>>();
	return (request) => {
		const known = readCookie(request, name);
		const id = known !== null && stores.has(known) ? known : crypto.randomUUID();
		const data = stores.get(id) ?? new Map<string, unknown>();
		stores.set(id, data);
		return {
			get: (key) => data.get(key),
			set: (key, value) => void data.set(key, value),
			forget: (key) => void data.delete(key),
			commit: (response) =>
				id === known ? response : withCookie(response, cookieLine(name, id, options)),
		};
	};
}

function readCookie(request: Request, name: string): string | null {
	for (const part of (request.headers.get("cookie") ?? "").split(";")) {
		const [key, ...value] = part.trim().split("=");
		if (key === name) {
			return decodeURIComponent(value.join("="));
		}
	}
	return null;
}

function cookieLine(name: string, id: string, options: MemorySessionOptions): string {
	const secure = options.secure === true ? "; Secure" : "";
	return `${name}=${encodeURIComponent(id)}; Path=/; HttpOnly; SameSite=Lax${secure}`;
}

export function withCookie(response: Response, line: string): Response {
	const copy = new Response(response.body, response);
	copy.headers.append("set-cookie", line);
	return copy;
}
