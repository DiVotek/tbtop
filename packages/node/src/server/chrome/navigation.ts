import type { IconSpec } from "../../dsl";
import { normalizeIcon } from "../../dsl/meta";
import type { NavEntry, PageDef } from "../page";
import { assembleGroups, type NavGroupDef, UNGROUPED, type WireItem } from "./navGroups";
import { type Text, text } from "./text";

/** NavItem.php as data: a link with no page and no gate, in the sidebar or the profile menu. */
export interface NavLink {
	label: Text;
	url: string;
	icon?: IconSpec;
	newTab?: boolean;
	/** Sidebar group (nav only); unset = ungrouped. */
	group?: string;
	/** Section key within the group (nav only). */
	section?: string;
	/** Sort position within the group (nav only). */
	sort?: number;
}

export interface NavPanel {
	prefix: string;
	pages: PageDef[];
	navigationGroups?: NavGroupDef[];
	navigationItems?: NavLink[];
}

interface Entry {
	nav: NavEntry;
	item: WireItem;
	allowed: boolean;
}

/**
 * NavBuilder::build(): pages with a `nav` and no route params, gated by their
 * `authorize`, plus the panel's own links. `nav.parent` (a page path) nests an
 * item; a child whose parent is gated out moves to its group's top level.
 */
export async function buildNav(panel: NavPanel, request: Request) {
	const entries = await collectPages(panel, request);
	assertValidParents(entries);
	const groups = new Map<string, WireItem[]>();
	const push = (group: string | undefined, item: WireItem, section: string | undefined) =>
		groups.set(group ?? UNGROUPED, [
			...(groups.get(group ?? UNGROUPED) ?? []),
			withSection(item, group, section),
		]);
	for (const [path, entry] of entries) {
		const parent = entry.nav.parent === undefined ? undefined : entries.get(entry.nav.parent);
		if (entry.allowed && parent?.allowed !== true) {
			push(entry.nav.group, withChildren(path, entries), entry.nav.section);
		}
	}
	for (const link of panel.navigationItems ?? []) {
		const { label, href, ...rest } = linkItem(link);
		push(link.group, { label, href, order: link.sort ?? 0, ...rest }, link.section);
	}
	return assembleGroups(groups, panel.navigationGroups ?? []);
}

/** The nav-eligible pages by path, each with its wire item and gate verdict. */
async function collectPages(panel: NavPanel, request: Request): Promise<Map<string, Entry>> {
	const eligible = panel.pages.filter(
		(page) => page.nav !== undefined && !page.path.includes("$"),
	);
	const entries = await Promise.all(
		eligible.map(async (page): Promise<[string, Entry]> => {
			const nav = page.nav as NavEntry;
			const allowed = (await page.authorize?.({ params: {}, request })) ?? true;
			return [
				page.path,
				{ nav, item: pageItem(nav, `${panel.prefix}/${page.path}`), allowed },
			];
		}),
	);
	return new Map(entries);
}

function assertValidParents(entries: Map<string, Entry>): void {
	for (const [path, { nav }] of entries) {
		if (nav.parent !== undefined && !entries.has(nav.parent)) {
			throw new TypeError(
				`Page "${path}" declares nav.parent "${nav.parent}", which is not a nav-eligible page in this panel.`,
			);
		}
		assertNoCycle(path, entries, new Set([path]));
	}
}

function assertNoCycle(path: string, entries: Map<string, Entry>, seen: Set<string>): void {
	const parent = entries.get(path)?.nav.parent;
	if (parent === undefined) {
		return;
	}
	if (seen.has(parent)) {
		throw new TypeError(
			`Nav parent cycle detected: "${parent}" is its own ancestor via "${path}".`,
		);
	}
	assertNoCycle(parent, entries, new Set([...seen, parent]));
}

/** The page's item plus its visible children, sorted; no `children` key when there are none. */
function withChildren(path: string, entries: Map<string, Entry>): WireItem {
	const children = [...entries]
		.filter(([, entry]) => entry.nav.parent === path && entry.allowed)
		.map(([child]) => withChildren(child, entries))
		.sort((a, b) => a.order - b.order);
	const item = entries.get(path)?.item as WireItem;
	return children.length > 0 ? { ...item, children } : item;
}

/** Only a grouped top-level item carries its section; '' means unsectioned. */
function withSection(item: WireItem, group?: string, section?: string): WireItem {
	return group === undefined || section === undefined || section === ""
		? item
		: { ...item, section };
}

function pageItem(nav: NavEntry, href: string): WireItem {
	return {
		label: text(nav.label),
		href,
		order: nav.order ?? 0,
		...(nav.icon !== undefined ? { icon: normalizeIcon(nav.icon) } : {}),
		...(nav.badge !== undefined ? { badge: String(nav.badge) } : {}),
		...(nav.badge !== undefined && nav.badgeColor !== undefined
			? { badgeColor: nav.badgeColor }
			: {}),
	};
}

/** NavItem::toArray(): label/href always; icon and newTab only when set. */
export function linkItem(link: NavLink): { label: string; href: string } & Record<string, unknown> {
	return {
		label: text(link.label),
		href: link.url,
		...(link.icon !== undefined ? { icon: normalizeIcon(link.icon) } : {}),
		...(link.newTab === true ? { newTab: true } : {}),
	};
}

interface NavNode {
	href?: unknown;
	newTab?: unknown;
	children?: NavNode[];
}

/**
 * Where the bare panel URL lands: the first in-panel link of the built
 * sidebar, depth-first in render order. External and new-tab links are skipped.
 */
export function firstPageHref(groups: { items: NavNode[] }[], prefix: string): string | null {
	const walk = (items: NavNode[]): string | null => {
		for (const item of items) {
			const own = typeof item.href === "string" && item.href.startsWith(`${prefix}/`);
			const found =
				own && item.newTab !== true ? (item.href as string) : walk(item.children ?? []);
			if (found !== null) {
				return found;
			}
		}
		return null;
	};
	for (const group of groups) {
		const found = walk(group.items);
		if (found !== null) {
			return found;
		}
	}
	return null;
}
