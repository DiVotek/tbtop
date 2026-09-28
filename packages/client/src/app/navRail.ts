import { useEffect } from "react";
import { isExternalUrl } from "../structure/actionBlock";
import type { NavGroup, NavItem } from "./chromeContext";
import { isActiveUrl } from "./navGroupSection";
import { storageKey } from "./storageKey";

/**
 * The page a rail icon opens: the group's first internal, same-tab item in
 * rendered order. A group without one gets no rail icon — there is nowhere
 * to navigate, and it could never become active by URL either.
 */
export function railTarget(group: NavGroup): NavItem | undefined {
	return group.items.find((item) => !item.newTab && !isExternalUrl(item.href));
}

export function railGroups(nav: NavGroup[]): NavGroup[] {
	return nav.filter((group) => railTarget(group) !== undefined);
}

export type ActiveGroupSource = "url" | "page" | "remembered" | "first";

export interface ActiveGroup {
	key: string;
	source: ActiveGroupSource;
}

interface ResolveInput {
	nav: NavGroup[];
	currentUrl: string;
	pageGroup?: string;
	remembered?: string;
}

/**
 * URL match (longest href wins, ties go to nav order) → the page's own
 * nav() group → the last group this panel showed → the first rail entry.
 */
export function resolveActiveGroup({
	nav,
	currentUrl,
	pageGroup,
	remembered,
}: ResolveInput): ActiveGroup | undefined {
	const groups = railGroups(nav);
	const byUrl = longestUrlMatch(groups, currentUrl);
	if (byUrl !== undefined) {
		return { key: byUrl, source: "url" };
	}
	const known = new Set(groups.map((group) => group.key));
	if (pageGroup !== undefined && known.has(pageGroup)) {
		return { key: pageGroup, source: "page" };
	}
	if (remembered !== undefined && known.has(remembered)) {
		return { key: remembered, source: "remembered" };
	}
	const first = groups[0];
	return first ? { key: first.key, source: "first" } : undefined;
}

function longestUrlMatch(groups: NavGroup[], currentUrl: string): string | undefined {
	const matches = groups.flatMap((group) =>
		flatten(group.items)
			.filter((item) => isActiveUrl(item.href, currentUrl))
			.map((item) => ({ key: group.key, length: item.href.length })),
	);
	// Strict > keeps the earliest match on ties, so nav order wins.
	let best = matches[0];
	for (const match of matches) {
		if (best && match.length > best.length) {
			best = match;
		}
	}
	return best?.key;
}

function flatten(items: NavItem[]): NavItem[] {
	return items.flatMap((item) => [item, ...flatten(item.children ?? [])]);
}

/** Best-effort, like the collapse state: storage may be unavailable. */
export function readRememberedGroup(panelId: string): string | undefined {
	try {
		return window.localStorage.getItem(storageKey("nav-active-group", panelId)) ?? undefined;
	} catch {
		return undefined;
	}
}

export function rememberGroup(panelId: string, key: string): void {
	try {
		window.localStorage.setItem(storageKey("nav-active-group", panelId), key);
	} catch {
		// Persistence is best-effort; ignore storage failures.
	}
}

/**
 * rail-sidebar only: resolves the active group and remembers URL- and
 * page-resolved ones, so a later page outside the nav keeps the context.
 */
export function useRailActiveGroup(
	enabled: boolean,
	input: ResolveInput & { panelId?: string },
): string | undefined {
	const { nav, currentUrl, pageGroup, panelId = "" } = input;
	const active = enabled
		? resolveActiveGroup({
				nav,
				currentUrl,
				pageGroup,
				remembered: readRememberedGroup(panelId),
			})
		: undefined;
	const rememberable = active?.source === "url" || active?.source === "page";
	const key = active?.key;
	useEffect(() => {
		if (rememberable && key !== undefined) {
			rememberGroup(panelId, key);
		}
	}, [rememberable, key, panelId]);
	return key;
}
