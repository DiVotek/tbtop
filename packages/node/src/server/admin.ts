import { type AdminContext, materialize, runWithContext } from "../dsl";
import { ENDPOINTS, matchEndpoints, type ServerOptions } from "./endpoints";
import { errorResponse, HttpError, json, stripPrefix } from "./http";
import type { PageDef } from "./page";
import { type AdminPageProps, buildPageProps } from "./pageProps";
import { findPage, resolvePage } from "./resolve";

export type { AdminPageProps } from "./pageProps";

export interface AdminConfig extends ServerOptions {
	/** URL prefix of the panel, e.g. `/admin`. */
	prefix: string;
	pages: PageDef[];
	brand?: string;
	/** The host owns auth (better-auth, a session cookie…); the admin only reads the user. */
	user?: (request: Request) => unknown;
	/** Request-scoped settings: locales, timezone, a Gate-style `can`. */
	context?: (request: Request) => Partial<AdminContext> | Promise<Partial<AdminContext>>;
}

/** Every endpoint the path could be, paired with the page that owns it. */
function routes(pages: PageDef[], path: string | null) {
	return (path === null ? [] : matchEndpoints(path)).flatMap((m) => {
		const found = findPage(pages, m.pagePath);
		return found === null ? [] : [{ ...m, ...found }];
	});
}

export function createAdmin(config: AdminConfig) {
	const prefix = config.prefix.replace(/\/+$/, "");
	const panel = { prefix, brand: config.brand, pages: config.pages };

	/** Runs in the request's context; an HttpError becomes its JSON response. */
	async function guarded<T>(request: Request, run: () => Promise<T>): Promise<T | Response> {
		const user = (await config.user?.(request)) ?? null;
		const extra = (await config.context?.(request)) ?? {};
		return runWithContext({ user, ...extra }, () => run().catch(errorResponse));
	}

	/** Props for one page GET: what a TanStack loader returns. */
	async function pageProps(request: Request): Promise<AdminPageProps | Response> {
		const found = findPage(
			config.pages,
			stripPrefix(new URL(request.url).pathname, prefix) ?? "",
		);
		if (found === null) {
			return json({ message: "Not found" }, 404);
		}
		const ctx = { params: found.params, request };
		return guarded(request, async () =>
			buildPageProps(await resolvePage(found.page, ctx), panel),
		);
	}

	/**
	 * The endpoint cluster as one Web-standard handler: mount it in TanStack
	 * Start, Hono, Bun.serve or Elysia. Null means "not mine, fall through".
	 */
	async function handle(request: Request): Promise<Response | null> {
		const routed = routes(config.pages, stripPrefix(new URL(request.url).pathname, prefix));
		const match = routed.find((m) => m.endpoint.method === request.method);
		if (match === undefined) {
			return routed.length > 0 ? json({ message: "Method not allowed" }, 405) : null;
		}
		return guarded(request, async () => {
			const resolved = await resolvePage(match.page, { params: match.params, request });
			const body = await match.endpoint.run({
				resolved,
				request,
				args: match.args,
				options: config,
			});
			return json(await materialize(body));
		});
	}

	return { handle, pageProps, prefix, endpoints: ENDPOINTS };
}

export type Admin = ReturnType<typeof createAdmin>;
export { HttpError };
