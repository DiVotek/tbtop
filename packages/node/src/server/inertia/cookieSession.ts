import { own } from "../safeKeys";
import { cookieAttributes, readCookie, withCookie } from "./cookies";
import type { SessionResolver, SessionStore } from "./session";

export interface CookieSessionOptions {
	/** At least 32 characters; rotating it signs everyone out. */
	secret: string;
	cookie?: string;
	/** Cookie path; default `/`. Scope it to the panel prefix to keep panels apart. */
	path?: string;
	/** Seconds; default 2 hours (Laravel's `session.lifetime`). Sealed into the cookie too. */
	maxAge?: number;
	secure?: boolean;
}

/** Browsers drop cookies over 4096 bytes; fail loudly instead of losing the session. */
const MAX_COOKIE = 4000;

type Data = Record<string, unknown>;

/** What the cookie seals: the data and when it stops being accepted (ms). */
interface Sealed {
	v: Data;
	e: number;
}

/**
 * The whole session in one AES-GCM encrypted cookie (Laravel's `cookie`
 * driver): no store, so it runs anywhere Web Crypto does, Cloudflare Workers
 * included. Keep it small: the user, flashed errors and effects. The expiry is
 * inside the seal, so a copied cookie dies with its lifetime, not with the secret.
 */
export function cookieSessions(options: CookieSessionOptions): SessionResolver {
	if (options.secret.length < 32) {
		throw new TypeError("cookieSessions() needs a secret of at least 32 characters.");
	}
	const name = options.cookie ?? "tbtop_session";
	const lifetime = (options.maxAge ?? 7200) * 1000;
	const key = deriveKey(options.secret);
	return async (request) => {
		const raw = readCookie(request, name);
		const opened = raw === null ? null : await open(await key, raw);
		const write = async (next: Data) => {
			const value =
				Object.keys(next).length === 0 ? "" : await seal(await key, next, lifetime);
			if (value.length > MAX_COOKIE) {
				throw new RangeError(
					`The session cookie is ${value.length} bytes; keep it under 4 KB.`,
				);
			}
			return cookieLine(name, value, options);
		};
		// Past half its lifetime a live session is resealed, so activity keeps it alive.
		const stale = opened !== null && opened.e - Date.now() < lifetime / 2;
		return store(opened?.v ?? {}, stale, write);
	};
}

function store(data: Data, stale: boolean, line: (next: Data) => Promise<string>): SessionStore {
	let dirty = stale;
	return {
		get: (key) => own(data, key),
		set: (key, value) => {
			data[key] = value;
			dirty = true;
		},
		forget: (key) => {
			dirty = dirty || Object.hasOwn(data, key);
			delete data[key];
		},
		commit: async (response) => (dirty ? withCookie(response, await line(data)) : response),
	};
}

function cookieLine(name: string, value: string, options: CookieSessionOptions): string {
	const age = value === "" ? 0 : (options.maxAge ?? 7200);
	return `${name}=${value}; Max-Age=${age}; ${cookieAttributes(options)}`;
}

async function deriveKey(secret: string): Promise<CryptoKey> {
	const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
	return crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["encrypt", "decrypt"]);
}

async function seal(key: CryptoKey, data: Data, lifetime: number): Promise<string> {
	const iv = crypto.getRandomValues(new Uint8Array(12));
	const payload: Sealed = { v: data, e: Date.now() + lifetime };
	const plain = new TextEncoder().encode(JSON.stringify(payload));
	const sealed = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plain));
	return `${base64url(iv)}.${base64url(sealed)}`;
}

/** A tampered, expired or malformed cookie is no session (null), never an error. */
async function open(key: CryptoKey, raw: string): Promise<Sealed | null> {
	const [iv, sealed] = raw.split(".").map(fromBase64url);
	if (iv === undefined || sealed === undefined) {
		return null;
	}
	try {
		const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, sealed);
		return live(JSON.parse(new TextDecoder().decode(plain)));
	} catch {
		return null;
	}
}

function live(data: unknown): Sealed | null {
	const { v, e } = (data ?? {}) as Partial<Sealed>;
	const fresh = typeof e === "number" && e > Date.now();
	return fresh && v !== null && typeof v === "object" ? { v, e } : null;
}

function base64url(bytes: Uint8Array): string {
	return btoa(String.fromCharCode(...bytes))
		.replaceAll("+", "-")
		.replaceAll("/", "_")
		.replace(/=+$/, "");
}

function fromBase64url(text: string): Uint8Array<ArrayBuffer> | undefined {
	try {
		const binary = atob(text.replaceAll("-", "+").replaceAll("_", "/"));
		return Uint8Array.from(binary, (c) => c.charCodeAt(0));
	} catch {
		return undefined;
	}
}
