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

/** One store per request, so a page and its handlers share what they put. */
export function sessionCache(resolve: SessionResolver) {
	const cache = new WeakMap<Request, Promise<SessionStore>>();
	return (request: Request): Promise<SessionStore> => {
		const known = cache.get(request);
		if (known !== undefined) {
			return known;
		}
		const store = Promise.resolve(resolve(request));
		cache.set(request, store);
		return store;
	};
}
