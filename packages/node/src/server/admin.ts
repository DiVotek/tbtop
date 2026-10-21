import { type AdminContext, materialize, runWithContext } from "../dsl";
import { ENDPOINTS, matchEndpoints, type ServerOptions } from "./endpoints";
import { errorResponse, HttpError, json, stripPrefix } from "./http";
import { rootView as defaultRootView } from "./inertia/html";
import { isInertia, type RootView, redirectTo } from "./inertia/protocol";
import {
	memorySessions,
	SESSION_USER,
	type SessionResolver,
	type SessionStore,
} from "./inertia/session";
import type { PageDef } from "./page";
import { type AdminPageProps, buildPageProps } from "./pageProps";
import { type PanelView, pageResponse } from "./pageResponse";
import { findPage, resolvePage } from "./resolve";

export type { AdminPageProps } from "./pageProps";

export interface AdminConfig extends ServerOptions {
	/** URL prefix of the panel, e.g. `/admin`. */
	prefix: string;
	pages: PageDef[];
	brand?: string;
	/** The host's session; default: in-process, keyed by a cookie (one server only). */
	session?: SessionResolver;
	/** The host owns auth; by default the admin reads the user its login put in the session. */
	user?: (request: Request, session: SessionStore) => unknown;
	/** Guests visiting a non-public page are sent here (a page with `public: true`). */
	loginPath?: string;
	/** Asset version: a client on another version reloads the page (409). */
	version?: string | null;
	/** The first-load HTML document; `rootView({ head: viteTags(...) })` covers most hosts. */
	rootView?: RootView;
	/** Request-scoped settings: locales, timezone, a Gate-style `can`. */
	context?: (request: Request) => Partial<AdminContext> | Promise<Partial<AdminContext>>;
}

/** Every endpoint the path could be, paired with the page that owns it. */
function routes(pages: PageDef[], path: string) {
	return matchEndpoints(path).flatMap((m) => {
		const found = findPage(pages, m.pagePath);
		return found === null ? [] : [{ ...m, ...found }];
	});
}

/** The panel's request plumbing: session, user, context, the guest gate. */
class AdminServer {
	readonly prefix: string;
	readonly panel: PanelView;
	readonly sessions: (request: Request) => Promise<SessionStore>;
	private readonly readUser: NonNullable<AdminConfig["user"]>;

	constructor(private readonly config: AdminConfig) {
		this.prefix = config.prefix.replace(/\/+$/, "");
		this.panel = {
			prefix: this.prefix,
			brand: config.brand,
			pages: config.pages,
			version: config.version ?? null,
			rootView: config.rootView ?? defaultRootView(),
		};
		this.sessions = sessionCache(config.session ?? memorySessions());
		this.readUser = config.user ?? ((_, session) => session.get(SESSION_USER));
	}

	/** Runs in the request's context; an HttpError becomes its JSON response. */
	async inContext<T>(request: Request, run: () => Promise<T>): Promise<T | Response> {
		const session = await this.sessions(request);
		const user = (await this.readUser(request, session)) ?? null;
		const extra = (await this.config.context?.(request)) ?? {};
		return runWithContext({ user, ...extra }, () => run().catch(errorResponse));
	}

	/** inContext(), plus the session's Set-Cookie on the way out. */
	async guarded(request: Request, run: () => Promise<Response>): Promise<Response> {
		const response = await this.inContext(request, run);
		return (await (await this.sessions(request)).commit?.(response)) ?? response;
	}

	/** Props for one page, for a host that renders through its own router (a TanStack loader). */
	async pageProps(request: Request): Promise<AdminPageProps | Response> {
		const path = stripPrefix(new URL(request.url).pathname, this.prefix) ?? "";
		const found = findPage(this.config.pages, path);
		if (found === null) {
			return json({ message: "Not found" }, 404);
		}
		const ctx = { params: found.params, request };
		return this.inContext(request, async () =>
			buildPageProps(await resolvePage(found.page, ctx), this.panel),
		);
	}

	/**
	 * The `auth` middleware: a guest visiting a non-public page goes to the
	 * login page; the JSON endpoints answer 401.
	 */
	async denyGuest(request: Request, target: PageDef, json401: boolean): Promise<Response | null> {
		const { loginPath } = this.config;
		if (loginPath === undefined || target.public === true) {
			return null;
		}
		if ((await this.readUser(request, await this.sessions(request))) != null) {
			return null;
		}
		return json401 && !isInertia(request)
			? json({ message: "Unauthenticated." }, 401)
			: redirectTo(loginPath);
	}

	async endpoint(request: Request, path: string): Promise<Response | null> {
		const routed = routes(this.config.pages, path);
		const match = routed.find((m) => m.endpoint.method === request.method);
		if (match === undefined) {
			return routed.length > 0 ? json({ message: "Method not allowed" }, 405) : null;
		}
		return this.guarded(request, async () => {
			const denied = await this.denyGuest(request, match.page, true);
			if (denied !== null) {
				return denied;
			}
			const resolved = await resolvePage(match.page, { params: match.params, request });
			const body = await match.endpoint.run({
				resolved,
				request,
				args: match.args,
				options: this.config,
				session: await this.sessions(request),
			});
			return body instanceof Response ? body : json(await materialize(body));
		});
	}

	async page(request: Request, path: string): Promise<Response | null> {
		const found = request.method === "GET" ? findPage(this.config.pages, path) : null;
		if (found === null) {
			return null;
		}
		return this.guarded(request, async () => {
			const denied = await this.denyGuest(request, found.page, false);
			const session = await this.sessions(request);
			return denied ?? pageResponse(this.panel, { request, session, found });
		});
	}

	/** POST {prefix}/logout: the client's profile menu. Forgets the user, back to login. */
	logout(request: Request): Promise<Response> {
		return this.guarded(request, async () => {
			await (await this.sessions(request)).forget(SESSION_USER);
			return redirectTo(this.config.loginPath ?? `${this.prefix}/`);
		});
	}

	async handle(request: Request): Promise<Response | null> {
		const path = stripPrefix(new URL(request.url).pathname, this.prefix);
		if (path === null) {
			return null;
		}
		if (path === "logout" && request.method === "POST") {
			return this.logout(request);
		}
		return (await this.endpoint(request, path)) ?? this.page(request, path);
	}
}

export function createAdmin(config: AdminConfig) {
	const server = new AdminServer(config);
	return {
		/**
		 * The whole panel as one Web-standard handler: pages (Inertia), the
		 * endpoint cluster, logout. Mount it in Bun.serve, Hono, Elysia or a Start
		 * server entry. Null means "not mine, fall through".
		 */
		handle: (request: Request) => server.handle(request),
		pageProps: (request: Request) => server.pageProps(request),
		/** The request's session store: a login handler puts the user here. */
		session: (request: Request) => server.sessions(request),
		prefix: server.prefix,
		endpoints: ENDPOINTS,
	};
}

/** One store per request, so a page and its handlers share what they put. */
function sessionCache(resolve: SessionResolver) {
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

export type Admin = ReturnType<typeof createAdmin>;
export { HttpError };
