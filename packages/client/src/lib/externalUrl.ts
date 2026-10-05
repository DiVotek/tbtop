/**
 * External = off-origin or a non-http(s) scheme (mailto:/tel:). Inertia's
 * client navigation only works for same-origin admin routes, so external
 * links fall back to a normal browser navigation (<a>).
 */
export function isExternalUrl(href: string): boolean {
	if (typeof window === "undefined") {
		return false;
	}
	try {
		const url = new URL(href, window.location.href);
		if (url.protocol !== "http:" && url.protocol !== "https:") {
			return true;
		}
		return url.origin !== window.location.origin;
	} catch {
		return false;
	}
}
