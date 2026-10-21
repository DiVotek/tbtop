import { currentContext, materialize, runWithContext } from "../dsl";
import { notificationsRoute } from "../notifications/routes";
import { assertAppearance } from "./chrome/appearance";
import { expectsJson, notFoundOr, notFoundPage } from "./chrome/errorPage";
import type { AdminConfig } from "./config";
import { ENDPOINTS, routeEndpoints } from "./endpoints";
import { errorResponse, HttpError, json, stripPrefix } from "./http";
import { assertNoCollision, type McpConfig, mcpPath, mcpRoute, serveMcp } from "./mcp";

export { HttpError };

import { rootView as defaultRootView } from "./inertia/html";
import { isInertia, redirectTo } from "./inertia/protocol";
import { memorySessions, SESSION_USER, type SessionStore, sessionCache } from "./inertia/session";
import { currentLocale, localeContext, switchLocale, uiLocales } from "./locale";
import type { PageDef } from "./page";
import { type AdminPageProps, buildPageProps } from "./pageProps";
import { type PanelView, pageResponse } from "./pageResponse";
import { findPage, resolvePage } from "./resolve";

export type { AdminConfig } from "./config";
export type { AdminPageProps } from "./pageProps";

/** The panel's request plumbing: session, user, context, the guest gate. */
class AdminServer {
	readonly prefix: string;
	readonly panel: PanelView;
	readonly sessions: (request: Request) => Promise<SessionStore>;
	private readonly readUser: NonNullable<AdminConfig["user"]>;

	constructor(private readonly config: AdminConfig) {
		this.prefix = config.prefix.replace(/\/+$/, "");
		assertAppearance(config.navigation, config.appearance);
		if (config.mcp !== undefined) {
			assertNoCollision(config.mcp, config.pages);
		}
		this.panel = {
			...config,
			id: config.id ?? "admin",
			prefix: this.prefix,
			locales: uiLocales(config),
			uploads: config,
			pollInterval: config.notifications ? (config.notifications.pollInterval ?? 30) : null,
			version: config.version ?? null,
			rootView: config.rootView ?? defaultRootView(),
		};
		this.sessions = sessionCache(config.session ?? memorySessions());
		this.readUser = config.user ?? ((_, session) => session.get(SESSION_USER));
	}

	/** Runs in the request's context; an HttpError becomes its JSON response. */
	async inContext<T>(
		request: Request,
		run: () => Promise<T>,
		as?: unknown,
	): Promise<T | Response> {
		const session = await this.sessions(request);
		const user = as ?? (await this.readUser(request, session)) ?? null;
		const locale = localeContext(this.config, await currentLocale(this.config, session));
		const extra = (await this.config.context?.(request)) ?? {};
		const unsavedGuard = this.config.unsavedGuard ?? true;
		return runWithContext({ user, unsavedGuard, ...locale, ...extra }, () =>
			run().catch(errorResponse),
		);
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
		const routed = routeEndpoints(this.config.pages, path);
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
			return (
				denied ??
				pageResponse(this.panel, { request, session, found }).catch(
					notFoundOr(this.panel, request),
				)
			);
		});
	}

	/** The panel's Route::fallback(): any other GET under the prefix is the 404 page. */
	fallback(request: Request): Promise<Response> | null {
		if (!["GET", "HEAD"].includes(request.method) || expectsJson(request)) {
			return null;
		}
		return this.guarded(request, () => notFoundPage(this.panel, request));
	}

	/** The panel's own POST routes: logout and the UI locale switch. */
	panelRoute(request: Request, path: string): Promise<Response | null> | null {
		if (path === "api/notifications" || path.startsWith("api/notifications/")) {
			return this.notifications(request, path);
		}
		if (request.method !== "POST" || !["logout", "locale"].includes(path)) {
			return null;
		}
		if (path === "logout") {
			return this.logout(request);
		}
		return this.guarded(request, async () =>
			switchLocale(this.config, request, await this.sessions(request)),
		);
	}

	notifications(request: Request, path: string): Promise<Response | null> | null {
		const store = this.config.notifications?.store;
		if (store === undefined) {
			return null;
		}
		return this.guarded(request, async () => {
			const routed = await notificationsRoute(store, request, {
				path,
				user: currentContext().user,
			});
			return routed ?? json({ message: "Method not allowed" }, 405);
		});
	}

	/** POST {prefix}/logout: the client's profile menu. Forgets the user, back to login. */
	logout(request: Request): Promise<Response> {
		return this.guarded(request, async () => {
			await (await this.sessions(request)).forget(SESSION_USER);
			return redirectTo(this.config.loginPath ?? `${this.prefix}/`);
		});
	}

	/** POST {prefix}/mcp: the agent's token instead of the session, the tools as its user. */
	mcp(request: Request, mcp: McpConfig): Promise<Response> {
		const { pages } = this.config;
		const run = () =>
			serveMcp(request, { config: mcp, prefix: this.prefix, pages, options: this.config });
		return mcpRoute(
			request,
			mcp,
			async (user) => (await this.inContext(request, run, user)) as Response,
		);
	}

	async handle(request: Request): Promise<Response | null> {
		const path = stripPrefix(new URL(request.url).pathname, this.prefix);
		if (path === null) {
			return null;
		}
		const { mcp } = this.config;
		if (mcp !== undefined && path === mcpPath(mcp)) {
			return this.mcp(request, mcp);
		}
		return (
			(await this.panelRoute(request, path)) ??
			(await this.endpoint(request, path)) ??
			(await this.page(request, path)) ??
			this.fallback(request)
		);
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
		id: server.panel.id,
		prefix: server.prefix,
		endpoints: ENDPOINTS,
	};
}

export type Admin = ReturnType<typeof createAdmin>;
