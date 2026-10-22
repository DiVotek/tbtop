const SAFE_METHODS = ["GET", "HEAD", "OPTIONS"];

const hostOf = (url: string): string | null => {
	try {
		return new URL(url).host;
	} catch {
		return null;
	}
};

/**
 * Laravel's CSRF token, done with the headers browsers send instead: a
 * state-changing request whose Origin is another site (or, without Origin,
 * whose Sec-Fetch-Site says cross-site) is refused. The request's own host,
 * the proxy's forwarded host and `trustedOrigins` pass.
 */
export function isCrossSite(request: Request, trustedOrigins: string[] = []): boolean {
	if (SAFE_METHODS.includes(request.method)) {
		return false;
	}
	const origin = request.headers.get("origin");
	if (origin === null) {
		return request.headers.get("sec-fetch-site") === "cross-site";
	}
	const allowed = [
		new URL(request.url).host,
		request.headers.get("host"),
		request.headers.get("x-forwarded-host"),
		...trustedOrigins.map(hostOf),
	];
	const host = hostOf(origin);
	return host === null || !allowed.includes(host);
}
