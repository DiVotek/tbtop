import type { Admin, InertiaPage } from "../../src";

export type Visit = (url: string, init?: RequestInit & { inertia?: boolean }) => Promise<Response>;

/** A browser over admin.handle: keeps the session cookie, speaks Inertia when asked, follows nothing. */
export function browser(admin: Admin, version = "v1"): Visit {
	let cookie = "";
	return async (url, init = {}) => {
		const headers = new Headers(init.headers);
		headers.set("cookie", cookie);
		if (typeof init.body === "string" && !headers.has("content-type")) {
			headers.set("content-type", "application/json");
		}
		if (init.inertia === true) {
			headers.set("x-inertia", "true");
			headers.set("x-inertia-version", version);
		}
		const res = await admin.handle(new Request(`http://x${url}`, { ...init, headers }));
		if (res === null) {
			throw new TypeError(`${url} fell through`);
		}
		cookie = res.headers.get("set-cookie")?.split(";")[0] ?? cookie;
		return res;
	};
}

/** The JSON page of an Inertia visit. */
export async function visitPage(visit: Visit, url: string): Promise<InertiaPage> {
	return (await (await visit(url, { inertia: true })).json()) as InertiaPage;
}
