import { currentContext } from "../../dsl/context";
import { trans } from "../../i18n";
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

/**
 * PanelErrorPage::notFound(): the `admin/error` page inside the panel's shell,
 * or the chrome-less center layout for a guest, who must not see the nav.
 */
export async function notFoundPage(panel: PanelView, request: Request): Promise<Response> {
	const props = {
		status: 404,
		title: trans("state.pageNotFound"),
		message: trans("state.pageNotFoundHint"),
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
	return new Response(response.body, { status: 404, headers: response.headers });
}
