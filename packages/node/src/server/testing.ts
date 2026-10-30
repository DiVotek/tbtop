/**
 * What the testing entry tells the server about its own requests: the user a
 * request acts as. A production request is never in the map, so nothing here
 * changes how the panel answers it.
 */
const actingAs = new WeakMap<Request, unknown>();

/** Panel version per admin, so a test visit sends the version the panel expects. */
const versions = new WeakMap<object, string | null>();

export function actAs(request: Request, user: unknown): Request {
	actingAs.set(request, user ?? null);
	return request;
}

/** The user a test request acts as (null for a guest); any other request reads it with `read`. */
export function userFor(request: Request, read: () => unknown): unknown {
	return actingAs.has(request) ? actingAs.get(request) : read();
}

export function registerVersion<T extends object>(version: string | null, admin: T): T {
	versions.set(admin, version);
	return admin;
}

export function panelVersion(admin: object): string | null {
	return versions.get(admin) ?? null;
}
