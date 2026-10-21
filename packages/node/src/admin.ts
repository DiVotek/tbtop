import { ENDPOINTS } from "./endpoints";
import { toWire } from "./node";
import type { PageDef } from "./page";
import { sharedProps } from "./panel";
import { authorize, type Resolved, resolvePage } from "./resolve";
import { asJson, type Json, json, stripPrefix } from "./wire";

export type { Json } from "./wire";

export interface AdminUser {
	name?: string;
	email?: string;
}

export interface AdminConfig {
	/** URL prefix of the panel, e.g. `/admin`. */
	prefix: string;
	pages: PageDef[];
	brand?: string;
	/** The host owns auth (better-auth, a session cookie…); the admin only reads the user. */
	user?: (request: Request) => AdminUser | null | Promise<AdminUser | null>;
}

/** The Inertia `admin/page` props, unchanged: the React client reads exactly this. */
export interface AdminPageProps {
	slug: string;
	title: string;
	layout: "admin";
	structure: { [key: string]: Json };
	data: { [form: string]: { [key: string]: Json } };
	params: Record<string, string>;
	navGroup?: string;
	tbtop: { [key: string]: Json };
}

export function createAdmin(config: AdminConfig) {
	const prefix = config.prefix.replace(/\/+$/, "");

	async function authorized(request: Request, path: string): Promise<Resolved | Response> {
		const resolved = await resolvePage(config.pages, request, path);
		if (resolved === null) {
			return json({ message: "Not found" }, 404);
		}
		return (await authorize(resolved)) ?? resolved;
	}

	/** Props for one page GET: what a TanStack loader returns. */
	async function pageProps(request: Request): Promise<AdminPageProps | Response> {
		const resolved = await authorized(
			request,
			stripPrefix(new URL(request.url).pathname, prefix) ?? "",
		);
		if (resolved instanceof Response) {
			return resolved;
		}
		const { page, ctx, forms, tree } = resolved;
		const records = Object.fromEntries(
			[...forms].map(([name, form]) => [name, form.getRecord()]),
		);
		return {
			slug: page.path,
			title: typeof page.title === "function" ? page.title(ctx) : page.title,
			layout: "admin",
			structure: asJson(toWire(tree)),
			data: asJson(records),
			params: ctx.params,
			navGroup: page.nav?.group,
			tbtop: asJson(await sharedProps(config, prefix, request)),
		};
	}

	/**
	 * The endpoint cluster as one Web-standard handler: mount it in TanStack
	 * Start, Hono, Bun.serve or Elysia. Null means "not mine, fall through".
	 */
	async function handle(request: Request): Promise<Response | null> {
		const segments = (stripPrefix(new URL(request.url).pathname, prefix) ?? "").split("/");
		const segment = segments.at(-2) ?? "";
		if (segments.length < 2 || !Object.hasOwn(ENDPOINTS, segment)) {
			return null;
		}
		const endpoint = ENDPOINTS[segment];
		if (request.method !== endpoint.method) {
			return json({ message: "Method not allowed" }, 405);
		}
		const resolved = await authorized(request, segments.slice(0, -2).join("/"));
		if (resolved instanceof Response) {
			return resolved;
		}
		return endpoint.run(resolved, segments.at(-1) ?? "", request);
	}

	return { handle, pageProps, prefix };
}

export type Admin = ReturnType<typeof createAdmin>;
