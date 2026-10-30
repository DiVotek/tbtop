/** The Inertia page object (v3) the client's `createInertiaApp` boots from and visits into. */
export interface InertiaPage {
	component: string;
	props: Record<string, unknown>;
	url: string;
	version: string | null;
	flash: Record<string, unknown>;
	encryptHistory: boolean;
	clearHistory: boolean;
}

export type RootView = (page: InertiaPage) => string | Promise<string>;

/** Props a partial reload keeps even when not asked for (Laravel's `Inertia::always`). */
const ALWAYS = ["errors"];

export function isInertia(request: Request): boolean {
	return request.headers.has("x-inertia");
}

/** Path plus query, as Laravel's `$request->getRequestUri()`. */
export function requestUri(request: Request): string {
	const url = new URL(request.url);
	return `${url.pathname}${url.search}`;
}

/**
 * Stale assets: an Inertia GET with another version gets a 409 and the client
 * does a full reload of the same URL.
 */
export function versionConflict(request: Request, version: string | null): Response | null {
	const sent = request.headers.get("x-inertia-version") ?? "";
	if (!isInertia(request) || request.method !== "GET" || version === null || sent === version) {
		return null;
	}
	return new Response(null, { status: 409, headers: { "x-inertia-location": request.url } });
}

/** `only` / `except` of a partial reload, applied when it targets this component. */
export function partialProps(
	request: Request,
	component: string,
	props: Record<string, unknown>,
): Record<string, unknown> {
	if (request.headers.get("x-inertia-partial-component") !== component) {
		return props;
	}
	const only = list(request.headers.get("x-inertia-partial-data"));
	const except = list(request.headers.get("x-inertia-partial-except"));
	return Object.fromEntries(
		Object.entries(props).filter(
			([key]) =>
				ALWAYS.includes(key) ||
				((only.length === 0 || only.includes(key)) && !except.includes(key)),
		),
	);
}

function list(header: string | null): string[] {
	return (header ?? "").split(",").flatMap((part) => (part.trim() === "" ? [] : [part.trim()]));
}

/** JSON for a visit, the root HTML for a first load. */
export async function inertiaResponse(
	request: Request,
	page: InertiaPage,
	rootView: RootView,
): Promise<Response> {
	if (isInertia(request)) {
		return new Response(JSON.stringify(page), {
			headers: { "content-type": "application/json", "x-inertia": "true", vary: "X-Inertia" },
		});
	}
	return new Response(await rootView(page), {
		headers: { "content-type": "text/html; charset=utf-8", vary: "X-Inertia" },
	});
}

/** 303: the client re-requests with GET whatever method the form used. */
export function redirectTo(url: string): Response {
	return new Response(null, { status: 303, headers: { location: url } });
}

/** Laravel's `back()`: the referrer, else the given fallback. */
export function back(request: Request, fallback: string): Response {
	return redirectTo(request.headers.get("referer") ?? fallback);
}

/** `Inertia::location()`: a full-page visit, e.g. to another origin. */
export function location(request: Request, url: string): Response {
	if (!isInertia(request)) {
		return new Response(null, { status: 302, headers: { location: url } });
	}
	return new Response(null, { status: 409, headers: { "x-inertia-location": url } });
}

/** A redirect a visit can follow in place; another origin needs a full-page visit. */
export function redirectOrLocation(request: Request, url: string): Response {
	const target = new URL(url, request.url);
	return target.origin === new URL(request.url).origin
		? redirectTo(url)
		: location(request, target.href);
}
