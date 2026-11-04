import { cookieAttributes, readCookie, withCookie } from "./cookies";
import { SESSION_USER, type SessionResolver, type SessionStore } from "./session";

export interface MemorySessionOptions {
	cookie?: string;
	/** Cookie path; default `/`. Scope it to the panel prefix to keep panels apart. */
	path?: string;
	secure?: boolean;
	/** Idle seconds before a session is dropped; default 2 hours (Laravel's `session.lifetime`). */
	lifetime?: number;
}

interface Entry {
	data: Map<string, unknown>;
	seen: number;
}

/** How often expired sessions are swept, at most. */
const SWEEP_EVERY = 60_000;

class Registry {
	readonly entries = new Map<string, Entry>();
	private swept = Date.now();

	constructor(readonly lifetime: number) {}

	/** The live entry under a cookie id, touched; an expired one is gone. */
	live(id: string | null, now: number): Entry | undefined {
		this.sweep(now);
		const entry = id === null ? undefined : this.entries.get(id);
		if (entry === undefined || now - entry.seen > this.lifetime) {
			return undefined;
		}
		entry.seen = now;
		return entry;
	}

	private sweep(now: number): void {
		if (now - this.swept < SWEEP_EVERY) {
			return;
		}
		this.swept = now;
		for (const [id, entry] of this.entries) {
			if (now - entry.seen > this.lifetime) {
				this.entries.delete(id);
			}
		}
	}
}

/**
 * One request's view. Nothing is stored until something is set, so guests and
 * agents leave no entries; signing in or out moves the data to a fresh id.
 */
class MemorySession implements SessionStore {
	private id: string | null;

	constructor(
		private readonly registry: Registry,
		private readonly known: string | null,
		private readonly data: Map<string, unknown>,
	) {
		this.id = known;
	}

	get(key: string): unknown {
		return this.data.get(key);
	}

	set(key: string, value: unknown): void {
		this.data.set(key, value);
		this.claim(key === SESSION_USER);
	}

	forget(key: string): void {
		if (this.data.delete(key)) {
			this.claim(key === SESSION_USER);
		}
	}

	/** The id the cookie should carry: new on first write and on every sign-in/out. */
	private claim(rotate: boolean): void {
		if (this.id !== null && !rotate) {
			return;
		}
		if (this.id !== null) {
			this.registry.entries.delete(this.id);
		}
		this.id = crypto.randomUUID();
		this.registry.entries.set(this.id, { data: this.data, seen: Date.now() });
	}

	cookieId(): string | null {
		return this.id === this.known ? null : this.id;
	}
}

/**
 * An in-process session keyed by a random cookie id: enough for one server and
 * for tests. Multi-instance hosts pass their own store.
 */
export function memorySessions(options: MemorySessionOptions = {}): SessionResolver {
	const name = options.cookie ?? "tbtop_session";
	const registry = new Registry((options.lifetime ?? 7200) * 1000);
	return (request) => {
		const known = readCookie(request, name);
		const entry = registry.live(known, Date.now());
		const session = new MemorySession(
			registry,
			entry === undefined ? null : known,
			entry?.data ?? new Map(),
		);
		return {
			get: (key) => session.get(key),
			set: (key, value) => session.set(key, value),
			forget: (key) => session.forget(key),
			commit: (response) => {
				const id = session.cookieId();
				return id === null
					? response
					: withCookie(response, `${name}=${id}; ${cookieAttributes(options)}`);
			},
		};
	};
}
