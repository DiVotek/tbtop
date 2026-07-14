/**
 * Data-URL base from an Inertia page URL.
 * Query and trailing slashes stripped — consumers append
 * "/tables/x"; "/admin/pages/" would 404 as "//tables/x".
 */
export function pageBasePath(url: string): string {
	const path = url.split("?")[0] ?? "";
	return path.replace(/\/+$/, "");
}
