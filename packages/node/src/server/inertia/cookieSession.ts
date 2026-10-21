import { readCookie, type SessionResolver, type SessionStore, withCookie } from "./session";

export interface CookieSessionOptions {
	/** At least 32 characters; rotating it signs everyone out. */
	secret: string;
	cookie?: string;
	/** Seconds; default 2 hours (Laravel's `session.lifetime`). */
	maxAge?: number;
	secure?: boolean;
}

/** Browsers drop cookies over 4096 bytes; fail loudly instead of losing the session. */
const MAX_COOKIE = 4000;

/**
 * The whole session in one AES-GCM encrypted cookie (Laravel's `cookie`
 * driver): no store, so it runs anywhere Web Crypto does, Cloudflare Workers
 * included. Keep it small: the user, flashed errors and effects.
 */
export function cookieSessions(options: CookieSessionOptions): SessionResolver {
	if (options.secret.length < 32) {
		throw new TypeError("cookieSessions() needs a secret of at least 32 characters.");
	}
	const name = options.cookie ?? "tbtop_session";
	const key = deriveKey(options.secret);
	return async (request) => {
		const raw = readCookie(request, name);
		const data = raw === null ? {} : await open(await key, raw);
		return store(data, async (next) => {
			const value = Object.keys(next).length === 0 ? "" : await seal(await key, next);
			if (value.length > MAX_COOKIE) {
				throw new RangeError(
					`The session cookie is ${value.length} bytes; keep it under 4 KB.`,
				);
			}
			return cookieLine(name, value, options);
		});
	};
}

type Data = Record<string, unknown>;

function store(data: Data, line: (next: Data) => Promise<string>): SessionStore {
	let dirty = false;
	return {
		get: (key) => data[key],
		set: (key, value) => {
			data[key] = value;
			dirty = true;
		},
		forget: (key) => {
			dirty = dirty || key in data;
			delete data[key];
		},
		commit: async (response) => (dirty ? withCookie(response, await line(data)) : response),
	};
}

function cookieLine(name: string, value: string, options: CookieSessionOptions): string {
	const age = value === "" ? 0 : (options.maxAge ?? 7200);
	const secure = options.secure === true ? "; Secure" : "";
	return `${name}=${value}; Path=/; Max-Age=${age}; HttpOnly; SameSite=Lax${secure}`;
}

async function deriveKey(secret: string): Promise<CryptoKey> {
	const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
	return crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["encrypt", "decrypt"]);
}

async function seal(key: CryptoKey, data: Data): Promise<string> {
	const iv = crypto.getRandomValues(new Uint8Array(12));
	const plain = new TextEncoder().encode(JSON.stringify(data));
	const sealed = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plain));
	return `${base64url(iv)}.${base64url(sealed)}`;
}

/** A tampered, expired-key or malformed cookie is an empty session, never an error. */
async function open(key: CryptoKey, raw: string): Promise<Data> {
	const [iv, sealed] = raw.split(".").map(fromBase64url);
	if (iv === undefined || sealed === undefined) {
		return {};
	}
	try {
		const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, sealed);
		const data: unknown = JSON.parse(new TextDecoder().decode(plain));
		return data !== null && typeof data === "object" ? (data as Data) : {};
	} catch {
		return {};
	}
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
