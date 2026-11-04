import type { Crumb, PageDef, ViewCtx } from "../page";
import { resolveText } from "../page";
import type { NavGroupDef } from "./navGroups";
import { text } from "./text";

export interface CrumbPanel {
	prefix: string;
	pages: PageDef[];
	navigationGroups?: NavGroupDef[];
}

/**
 * BreadcrumbsBuilder::build(): the page's own crumbs, else its nav group
 * (linked to the group's first page this user may open) and its title.
 */
export async function buildBreadcrumbs(
	page: PageDef,
	ctx: ViewCtx,
	panel: CrumbPanel,
): Promise<Crumb[]> {
	if (page.breadcrumbs !== undefined) {
		return typeof page.breadcrumbs === "function" ? page.breadcrumbs(ctx) : page.breadcrumbs;
	}
	const title = { label: resolveText(page.title, ctx) ?? "" };
	const group = page.nav?.group;
	if (group === undefined) {
		return [title];
	}
	const def = panel.navigationGroups?.find((candidate) => candidate.key === group);
	const url = await groupUrl(group, page, { ...panel, request: ctx.request });
	const label = text(def?.label ?? group);
	return [url === null ? { label } : { label, url }, title];
}

async function groupUrl(
	group: string,
	current: PageDef,
	panel: CrumbPanel & { request: Request },
): Promise<string | null> {
	const candidates = panel.pages.filter(
		(page) => page !== current && page.nav?.group === group && !page.path.includes("$"),
	);
	for (const page of candidates) {
		// The sidebar's gate: never link a crumb to a 403.
		if ((await page.authorize?.({ params: {}, request: panel.request })) ?? true) {
			return `${panel.prefix}/${page.path}`;
		}
	}
	return null;
}
