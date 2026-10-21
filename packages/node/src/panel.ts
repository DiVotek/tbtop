import type { AdminConfig } from "./admin";
import type { NavEntry, PageDef } from "./page";

/** The `tbtop` shared prop (PanelSharedProps.php): chrome, nav and the signed-in user. */
export async function sharedProps(
	config: AdminConfig,
	prefix: string,
	request: Request,
): Promise<Record<string, unknown>> {
	return {
		panel: "admin",
		prefix,
		apiBase: `${prefix}/api`,
		user: (await config.user?.(request)) ?? null,
		brand: config.brand ?? null,
		navigation: "sidebar",
		nav: navGroups(config.pages, prefix),
		locale: "en",
		locales: ["en"],
	};
}

interface NavGroup {
	key: string;
	group: string | null;
	items: unknown[];
}

function navGroups(pages: PageDef[], prefix: string): NavGroup[] {
	const groups = new Map<string, NavGroup>();
	const entries = pages
		.flatMap((page) => (page.nav ? [{ page, nav: page.nav }] : []))
		.sort((a, b) => (a.nav.order ?? 0) - (b.nav.order ?? 0));
	for (const { page, nav } of entries) {
		const key = nav.group ?? "";
		const group = groups.get(key) ?? { key: key || "_", group: nav.group ?? null, items: [] };
		group.items.push(navItem(nav, `${prefix}/${page.path}`));
		groups.set(key, group);
	}
	return [...groups.values()];
}

function navItem(nav: NavEntry, href: string) {
	return {
		label: nav.label,
		href,
		icon: nav.icon ? { name: nav.icon, position: "left" } : undefined,
	};
}
