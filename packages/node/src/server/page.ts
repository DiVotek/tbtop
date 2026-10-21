import type { ActionBuilder, IconSpec, Node, S } from "../dsl";
import type { Text } from "./chrome/text";

/** A page's sidebar entry (Page::nav()). */
export interface NavEntry {
	label: Text;
	/** Key of the sidebar group; declare its label/icon in the panel's `navigationGroups`. */
	group?: string;
	/** Section key within the group, declared on its NavGroupDef. */
	section?: string;
	/** Path of the page this one nests under. */
	parent?: string;
	icon?: IconSpec;
	order?: number;
	badge?: string | number;
	badgeColor?: string;
}

/** One breadcrumb; the last one (the current page) has no url. */
export interface Crumb {
	label: string;
	url?: string;
}

export interface ViewCtx {
	params: Record<string, string>;
	request: Request;
}

/**
 * A page (Pages/Page.php) as a plain object. `view` runs on every request with
 * a fresh S: closures are re-resolved by name, never serialized.
 */
export interface PageDef<P extends string = string> {
	/** Relative to the panel prefix, TanStack-style params: `posts/$post/edit`. */
	path: P;
	title: string | ((ctx: ViewCtx) => string);
	subtitle?: string | ((ctx: ViewCtx) => string);
	layout?: "admin" | "center";
	nav?: NavEntry;
	/** Returning false answers 403 (Page::can() in PHP). */
	authorize?: (ctx: ViewCtx) => boolean | Promise<boolean>;
	/** Overrides the crumbs built from `nav` (group, then the page title). */
	breadcrumbs?: Crumb[] | ((ctx: ViewCtx) => Crumb[]);
	/** Reachable without a user when the panel has a `loginPath` (the login page itself). */
	public?: boolean;
	view: (s: S, ctx: ViewCtx) => unknown;
	headerActions?: (s: S, ctx: ViewCtx) => (ActionBuilder | Node)[];
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
	for (const [i, segment] of want.entries()) {
		const actual = got[i] ?? "";
		if (segment.startsWith("$")) {
			params[segment.slice(1)] = decodeURIComponent(actual);
		} else if (segment !== actual) {
			return null;
		}
	}
	return params;
}

export function resolveText(text: PageDef["title"] | undefined, ctx: ViewCtx): string | undefined {
	return typeof text === "function" ? text(ctx) : text;
}
