import type { IconDef } from "../../ui/node-icon";

/** A custom palette command from `tbtop.palette.commands`. */
export interface PaletteCommand {
	label: string;
	href?: string;
	handler?: string;
	icon?: IconDef;
	group?: string;
	newTab?: boolean;
	keywords?: string[];
}

/** Command-palette config from the `tbtop.palette` shared prop; null = disabled. */
export interface CommandPaletteData {
	placeholder?: string;
	hotkey: string;
	includeNav?: boolean;
	commands?: PaletteCommand[];
}

/** A resolved, runnable palette entry — a nav destination or a custom command. */
export interface PaletteItem {
	id: string;
	label: string;
	group?: string;
	icon?: IconDef;
	keywords: string[];
	run: () => void;
}
