import type { SessionStore } from "../inertia/session";
import type { HostRule } from "../validation/validator";
import { pathOf } from "./urls";

const SESSION_KEY = "tbtop-admin.issued-uploads";

/**
 * Per field, the paths the upload endpoint issued to this session. Kept small:
 * a cookie session carries it (IssuedUploadPath keeps 100 server-side).
 */
const MAX_PER_FIELD = 20;

type Issued = Record<string, string[]>;

async function issued(session: SessionStore): Promise<Issued> {
	const value = await session.get(SESSION_KEY);
	return value !== null && typeof value === "object" ? (value as Issued) : {};
}

/** IssuedUploadPath::remember(). */
export async function rememberIssued(session: SessionStore, field: string, path: string) {
	const all = await issued(session);
	await session.set(SESSION_KEY, {
		...all,
		[field]: [...(all[field] ?? []), path].slice(-MAX_PER_FIELD),
	});
}

/** Every path in a stored value: a string, an envelope, or a list or locale map of them. */
export function pathsIn(value: unknown): string[] {
	const single = pathOf(value);
	if (single !== null) {
		return [single];
	}
	if (value === null || typeof value !== "object") {
		return [];
	}
	return Object.values(value).flatMap(pathsIn);
}

/** The rule name bindUploads() appends: `tbtop_issued_upload:<field>`. */
export const ISSUED_RULE = "tbtop_issued_upload";

/**
 * IssuedUploadPath: a submitted path is one the records already store for the
 * field, or one this session was issued. Anything else points at someone
 * else's file, and rendering would mint a signed URL for it.
 */
export async function issuedRule(session: SessionStore, records: unknown[]): Promise<HostRule> {
	const own = await issued(session);
	return {
		message: "The selected :attribute is invalid.",
		check: (value, [field = ""]) =>
			typeof value !== "string" ||
			value === "" ||
			storedUnder(records, field).includes(value) ||
			(own[field] ?? []).includes(value),
	};
}

/** Every path stored under the field's name, at any depth (repeater rows, locales). */
function storedUnder(value: unknown, field: string): string[] {
	if (value === null || typeof value !== "object") {
		return [];
	}
	return Object.entries(value).flatMap(([key, child]) =>
		key === field ? pathsIn(child) : storedUnder(child, field),
	);
}
