import { currentContext } from "../dsl";
import { notificationsRoute } from "../notifications/routes";
import type { AdminConfig } from "./config";
import { json } from "./http";
import { redirectTo } from "./inertia/protocol";
import { SESSION_USER, type SessionStore } from "./inertia/session";
import { switchLocale } from "./locale";

/** What the panel's own routes need from the server. */
export interface PanelServer {
	readonly config: AdminConfig;
	readonly prefix: string;
	sessions(request: Request): Promise<SessionStore>;
	hasUser(request: Request): Promise<boolean>;
	guarded(request: Request, run: () => Promise<Response>): Promise<Response>;
}

/** The panel's own routes: the bell's API, logout and the UI locale switch. */
export function panelRoute(
	server: PanelServer,
	request: Request,
	path: string,
): Promise<Response | null> | null {
	if (path === "api/notifications" || path.startsWith("api/notifications/")) {
		return notifications(server, request, path);
	}
	if (request.method !== "POST" || !["logout", "locale"].includes(path)) {
		return null;
	}
	if (path === "logout") {
		return logout(server, request);
	}
	return server.guarded(request, async () =>
		switchLocale(server.config, request, await server.sessions(request)),
	);
}

function notifications(
	server: PanelServer,
	request: Request,
	path: string,
): Promise<Response> | null {
	const store = server.config.notifications?.store;
	if (store === undefined) {
		return null;
	}
	return server.guarded(request, async () => {
		if (!(await server.hasUser(request))) {
			return json({ message: "Unauthenticated." }, 401);
		}
		const routed = await notificationsRoute(store, request, {
			path,
			user: currentContext().user,
		});
		return routed ?? json({ message: "Method not allowed" }, 405);
	});
}

/** POST {prefix}/logout: the client's profile menu. Forgets the user, back to login. */
function logout(server: PanelServer, request: Request): Promise<Response> {
	return server.guarded(request, async () => {
		await (await server.sessions(request)).forget(SESSION_USER);
		return redirectTo(server.config.loginPath ?? `${server.prefix}/`);
	});
}
