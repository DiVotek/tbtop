import type { Child } from "./node";
import type { S } from "./s";

export interface NavEntry {
	group?: string;
	label: string;
	icon?: string;
	order?: number;
}

export interface ViewCtx {
	params: Record<string, string>;
	request: Request;
}

/**
 * A page (Pages/Page.php) as a plain object instead of a class. `view` runs on
 * every request — closures are re-resolved by name, never serialized.
 */
export interface PageDef<P extends string = string> {
	/** Relative to the panel prefix, TanStack-style params: `posts/$post/edit`. */
	path: P;
	title: string | ((ctx: ViewCtx) => string);
	nav?: NavEntry;
	/** Returning false answers 403 (`can()` + Gate in PHP). */
	authorize?: (ctx: ViewCtx) => boolean | Promise<boolean>;
	view: (s: S, ctx: ViewCtx) => Child | Promise<Child>;
}

export function definePage<const P extends string>(page: PageDef<P>): PageDef<P> {
	return page;
}

/** `posts/$post/edit` against `posts/7/edit` → `{ post: "7" }`. */
export function matchPath(pattern: string, path: string): Record<string, string> | null {
	const want = pattern.split("/").filter(Boolean);
	const got = path.split("/").filter(Boolean);
	if (want.length !== got.length) {
		return null;
	}
	const params: Record<string, string> = {};
	for (const [i, seg] of want.entries()) {
		const actual = got[i] ?? "";
		if (seg.startsWith("$")) {
			params[seg.slice(1)] = decodeURIComponent(actual);
		} else if (seg !== actual) {
			return null;
		}
	}
	return params;
}
