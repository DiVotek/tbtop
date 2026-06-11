import { createContext, type ReactNode, useContext } from "react";

export interface NavItem {
	label: string;
	href: string;
}

export interface NavGroup {
	group: string;
	items: NavItem[];
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
	/** React `slots.logo` escape hatch, threaded into the logo block. */
	logoSlot?: ReactNode;
}

const EMPTY_CHROME_DATA: ChromeData = {
	nav: [],
	user: null,
	currentUrl: "",
	brand: null,
};

export const ChromeDataContext = createContext<ChromeData>(EMPTY_CHROME_DATA);

export function useChromeData(): ChromeData {
	return useContext(ChromeDataContext);
}
