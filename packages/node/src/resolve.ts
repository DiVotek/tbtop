import { Action } from "./actions";
import { Form } from "./form";
import { type Child, walk } from "./node";
import { matchPath, type PageDef, type ViewCtx } from "./page";
import { s } from "./s";
import { Table } from "./table";
import { json } from "./wire";

/** One page rebuilt for one request: closures are found by name, never serialized (ResolvedPage.php). */
export interface Resolved {
	page: PageDef;
	ctx: ViewCtx;
	tree: Child;
	forms: Map<string, Form>;
	actions: Map<string, Action>;
	tables: Map<string, Table>;
}

export async function resolvePage(
	pages: PageDef[],
	request: Request,
	path: string,
): Promise<Resolved | null> {
	for (const page of pages) {
		const params = matchPath(page.path, path);
		if (params !== null) {
			const ctx = { params, request };
			return index(page, ctx, await page.view(s, ctx));
		}
	}
	return null;
}

function index(page: PageDef, ctx: ViewCtx, tree: Child): Resolved {
	const resolved: Resolved = {
		page,
		ctx,
		tree,
		forms: new Map(),
		actions: new Map(),
		tables: new Map(),
	};
	walk(tree, (v) => {
		if (v instanceof Form) {
			resolved.forms.set(v.name, v);
		}
		if (v instanceof Action) {
			resolved.actions.set(v.name, v);
		}
		if (v instanceof Table) {
			resolved.tables.set(v.name, v);
		}
	});
	return resolved;
}

export async function authorize({ page, ctx }: Resolved): Promise<Response | null> {
	if (page.authorize === undefined || (await page.authorize(ctx))) {
		return null;
	}
	return json({ message: "This action is unauthorized." }, 403);
}
