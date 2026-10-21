import {
	inertiaResponse,
	partialProps,
	type RootView,
	requestUri,
	versionConflict,
} from "./inertia/protocol";
import { pull, type SessionStore } from "./inertia/session";
import type { PageDef } from "./page";
import { buildPageProps } from "./pageProps";
import { resolvePage } from "./resolve";
import type { UploadOptions } from "./uploads/config";

const COMPONENT = "admin/page";

export interface PanelView {
	prefix: string;
	brand?: string;
	pages: PageDef[];
	locales: string[];
	uploads: UploadOptions;
	version: string | null;
	rootView: RootView;
}

export interface PageRequest {
	request: Request;
	session: SessionStore;
	found: { page: PageDef; params: Record<string, string> };
}

/** PageController::show() over the Inertia protocol, with the flashed errors and effects. */
export async function pageResponse(panel: PanelView, visit: PageRequest): Promise<Response> {
	const { request, session, found } = visit;
	const conflict = versionConflict(request, panel.version);
	if (conflict !== null) {
		return conflict;
	}
	const resolved = await resolvePage(found.page, { params: found.params, request });
	const props = {
		...(await buildPageProps(resolved, panel)),
		errors: await flashed(session, "errors"),
	};
	return inertiaResponse(
		request,
		{
			component: COMPONENT,
			props: partialProps(request, COMPONENT, props),
			url: requestUri(request),
			version: panel.version,
			flash: await flashed(session, "flash"),
			encryptHistory: false,
			clearHistory: false,
		},
		panel.rootView,
	);
}

async function flashed(session: SessionStore, key: string): Promise<Record<string, unknown>> {
	const value = await pull(session, key);
	return value !== null && typeof value === "object" ? (value as Record<string, unknown>) : {};
}
