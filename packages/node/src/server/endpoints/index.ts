import { DATA_ENDPOINTS } from "./data";
import { FIELD_ENDPOINTS } from "./fields";
import { FORM_ENDPOINTS } from "./forms";
import { TABLE_ENDPOINTS } from "./tables";
import type { Endpoint } from "./types";

export type { EndpointCtx, ServerOptions } from "./types";

/** The page-scoped endpoint cluster (routes/admin.php), minus uploads and media. */
export const ENDPOINTS: Endpoint[] = [
	...FORM_ENDPOINTS,
	...TABLE_ENDPOINTS,
	...FIELD_ENDPOINTS,
	...DATA_ENDPOINTS,
];

export interface EndpointMatch {
	endpoint: Endpoint;
	pagePath: string;
	args: string[];
}

/** Every endpoint whose pattern ends the path; the rest is the page path. */
export function matchEndpoints(path: string): EndpointMatch[] {
	const segments = path.split("/").filter(Boolean);
	return ENDPOINTS.flatMap((endpoint) => {
		const tail = segments.slice(segments.length - endpoint.pattern.length);
		if (tail.length !== endpoint.pattern.length || segments.length < tail.length) {
			return [];
		}
		const fits = endpoint.pattern.every((p, i) => p.startsWith(":") || p === tail[i]);
		if (!fits) {
			return [];
		}
		const args = endpoint.pattern.flatMap((p, i) =>
			p.startsWith(":") ? [decodeURIComponent(tail[i] ?? "")] : [],
		);
		return [{ endpoint, pagePath: segments.slice(0, -tail.length).join("/"), args }];
	});
}
