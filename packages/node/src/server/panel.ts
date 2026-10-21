import type { NavEntry, PageDef } from "./page";

export interface PanelInfo {
	prefix: string;
	brand?: string;
	pages: PageDef[];
	user: unknown;
	locales: string[];
}

/** The `tbtop` shared prop (PanelSharedProps.php): chrome, nav and the signed-in user. */
export function sharedProps(panel: PanelInfo): Record<string, unknown> {
	return {
		panel: "admin",
		prefix: panel.prefix,
		apiBase: `${panel.prefix}/api`,
		user: panel.user ?? null,
		brand: panel.brand ?? null,
		navigation: "sidebar",
		nav: navGroups(panel.pages, panel.prefix),
		locale: "en",
		locales: panel.locales,
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
