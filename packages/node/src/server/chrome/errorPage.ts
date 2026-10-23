import { currentContext } from "../../dsl/context";
import { trans } from "../../i18n";
import { HttpError } from "../http";
import { inertiaResponse, requestUri } from "../inertia/protocol";
import type { PanelView } from "../pageResponse";
import { sharedProps } from "../panel";

/** Laravel's expectsJson(): an XHR that takes anything, or a client that asks for JSON. */
export function expectsJson(request: Request): boolean {
	const accept = request.headers.get("accept") ?? "";
	const xhr = request.headers.get("x-requested-with") === "XMLHttpRequest";
	return (
		(xhr && /^(\*\/\*)?$/.test(accept.trim())) || /[/+]json/.test(accept.split(",")[0] ?? "")
	);
}

/** The page a status renders; Laravel's own 403 page stands for the forbidden one. */
const TEXTS: Record<number, [string, string]> = {
	404: ["state.pageNotFound", "state.pageNotFoundHint"],
	403: ["state.forbidden", "state.forbidden"],
};

/** PanelErrorPage::notFound(). */
export function notFoundPage(panel: PanelView, request: Request): Promise<Response> {
	return errorPage(panel, request, 404);
}

/**
 * PanelErrorPage::render(): the `admin/error` page inside the panel's shell,
 * or the chrome-less center layout for a guest, who must not see the nav.
 */
async function errorPage(panel: PanelView, request: Request, status: number): Promise<Response> {
	const [title = "", message = ""] = TEXTS[status] ?? [];
	const props = {
		status,
		title: trans(title),
		message: trans(message),
		layout: currentContext().user == null ? "center" : "admin",
		tbtop: await sharedProps(panel, request),
		errors: {},
	};
	const response = await inertiaResponse(
		request,
		{
			component: "admin/error",
			props,
			url: requestUri(request),
			version: panel.version,
			flash: {},
			encryptHistory: false,
			clearHistory: false,
		},
		panel.rootView,
	);
	return new Response(response.body, { status, headers: response.headers });
}

/** A catch for a page visit: a 404 or 403 the page raises renders as a page, not raw JSON. */
export function notFoundOr(panel: PanelView, request: Request) {
	return (error: unknown): Promise<Response> =>
		error instanceof HttpError && error.status in TEXTS && !expectsJson(request)
			? errorPage(panel, request, error.status)
			: Promise.reject(error);
}
