import type { AdminContext } from "../dsl";
import type { NotificationStore } from "../notifications/store";
import type { ServerOptions } from "./endpoints";
import type { RootView } from "./inertia/protocol";
import type { SessionResolver, SessionStore } from "./inertia/session";
import type { LocaleConfig } from "./locale";
import type { PageDef } from "./page";

export interface AdminConfig extends ServerOptions, LocaleConfig {
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
	/** The header bell's store; `pollInterval` in seconds (null: no polling). */
	notifications?: { store: NotificationStore; pollInterval?: number | null };
	/** Request-scoped settings: locales, timezone, a Gate-style `can`. */
	context?: (request: Request) => Partial<AdminContext> | Promise<Partial<AdminContext>>;
}
