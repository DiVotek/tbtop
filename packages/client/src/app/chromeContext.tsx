import { createContext, type ReactNode, useContext } from "react";
import type { IconDef } from "../ui/node-icon";
import type { ThemeMode } from "./appearance";

export interface NavItem {
	label: string;
	href: string;
	icon?: IconDef;
	badge?: string;
	badgeColor?: string;
	newTab?: boolean;
	/** Section key within the group; only top-level items of a named group carry one. */
	section?: string;
	children?: NavItem[];
}

export interface NavGroup {
	/** Stable, unlocalized key — used to persist collapse state across locales. */
	key: string;
	/** Display label; null = ungrouped items, rendered without heading or indent. */
	group: string | null;
	items: NavItem[];
	icon?: IconDef;
	collapsible?: boolean;
	collapsed?: boolean;
	/** Headings for the section keys its items carry, in render order. */
	sections?: { key: string; label: string }[];
}

export interface ChromeUser {
	name?: string;
	email?: string;
}

/**
 * Shell data the predefined chrome blocks read. Chrome nodes arrive
 * option-less over the wire; everything they render comes from here
 * (fed by shared props through AdminLayoutShell).
 */
export interface ChromeData {
	nav: NavGroup[];
	user: ChromeUser | null;
	currentUrl: string;
	brand: string | null;
	/**
	 * How the nav menu lays itself out. "vertical" is the sidebar default;
	 * "horizontal" is the topbar layout; "rail" is the collapsed sidebar — a
	 * narrow strip of group icons, each opening its items in a side dropdown.
	 */
	orientation: "vertical" | "horizontal" | "rail" | "rail-sidebar" | "rail-drawer";
	/**
	 * rail-sidebar layout only: the resolved active group key. "rail-sidebar"
	 * renders the icon strip that navigates between groups; "rail-drawer" is
	 * its mobile form — an icon row that swaps the list below without navigating.
	 */
	activeGroup?: string;
	/** React `slots.logo` escape hatch, threaded into the logo block. */
	logoSlot?: ReactNode;
	/** Panel home URL (tbtop.prefix); the logo links here when present. */
	homeUrl?: string | null;
	/** Poll interval (ms) for the notifications bell; null disables polling. */
	notificationsPollInterval?: number | null;
	/** Dark-mode policy from tbtop.appearance; undefined = enabled. */
	darkMode?: boolean;
	/** Initial theme when the visitor has no saved preference. */
	defaultTheme?: ThemeMode;
	/** Custom profile-dropdown entries from PanelConfig::userMenuItems(). */
	userMenuItems?: NavItem[];
}

const EMPTY_CHROME_DATA: ChromeData = {
	nav: [],
	user: null,
	currentUrl: "",
	brand: null,
	orientation: "vertical",
};

export const ChromeDataContext = createContext<ChromeData>(EMPTY_CHROME_DATA);

export function useChromeData(): ChromeData {
	return useContext(ChromeDataContext);
}

/**
 * Re-provides chrome data with a different nav orientation for a subtree.
 * The topbar bar wraps its nav as "horizontal"; the mobile drawer keeps
 * the page-level "vertical", so the same sidebar tree renders both ways.
 */
export function OrientationProvider({
	orientation,
	children,
}: {
	orientation: ChromeData["orientation"];
	children: ReactNode;
}) {
	const data = useChromeData();
	return (
		<ChromeDataContext.Provider value={{ ...data, orientation }}>
			{children}
		</ChromeDataContext.Provider>
	);
}
