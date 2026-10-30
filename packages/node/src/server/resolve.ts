import { type ActionBuilder, type Node, S } from "../dsl";
import { HttpError } from "./http";
import { matchPath, type PageDef, type ViewCtx } from "./page";

/** One page rebuilt for one request (ResolvedPage.php): handlers are found by name in `s`. */
export interface Resolved {
	page: PageDef;
	ctx: ViewCtx;
	s: S;
	tree: unknown;
	headerActions: (ActionBuilder | Node)[];
}

export function findPage(
	pages: PageDef[],
	path: string,
): { page: PageDef; params: Record<string, string> } | null {
	for (const page of pages) {
		const params = matchPath(page.path, path);
		if (params !== null) {
			return { page, params };
		}
	}
	return null;
}

/** Authorizes, then builds the page: view() and headerActions() register every handler. */
export async function resolvePage(page: PageDef, ctx: ViewCtx): Promise<Resolved> {
	if (page.authorize !== undefined && !(await page.authorize(ctx))) {
		throw new HttpError(403, "This action is unauthorized.");
	}
	const s = new S();
	const tree = await page.view(s, ctx);
	return { page, ctx, s, tree, headerActions: page.headerActions?.(s, ctx) ?? [] };
}
