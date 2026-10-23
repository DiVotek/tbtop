import type { IconSpec } from "../../dsl";
import { normalizeIcon } from "../../dsl/meta";
import { type Text, text } from "./text";

/** Command.php as data: navigate to `url`, or run a client handler from definePaletteCommand(). */
export interface PaletteCommand {
	label: Text;
	url?: string;
	handler?: string;
	icon?: IconSpec;
	group?: string;
	/** Open `url` in a new tab; no effect with `handler`. */
	newTab?: boolean;
	/** Extra search terms beyond the label. */
	keywords?: string[];
}

/** CommandPaletteConfig.php: the ⌘K palette, on by default and listing every sidebar destination. */
export interface PaletteConfig {
	placeholder?: Text;
	/** Default `mod+k`. */
	hotkey?: string;
	/** Auto-list sidebar destinations (default true); false = commands only. */
	includeNav?: boolean;
	commands?: PaletteCommand[];
}

/** The sparse `tbtop.palette` prop; null when the panel turned the palette off. */
export function paletteProp(
	config: boolean | PaletteConfig = true,
): Record<string, unknown> | null {
	if (config === false) {
		return null;
	}
	const palette = config === true ? {} : config;
	return {
		hotkey: palette.hotkey ?? "mod+k",
		...(palette.placeholder !== undefined ? { placeholder: text(palette.placeholder) } : {}),
		...(palette.includeNav === false ? { includeNav: false } : {}),
		...(palette.commands?.length ? { commands: palette.commands.map(commandItem) } : {}),
	};
}

function commandItem(command: PaletteCommand): Record<string, unknown> {
	return {
		label: text(command.label),
		...(command.url ? { href: command.url } : {}),
		...(command.handler !== undefined ? { handler: command.handler } : {}),
		...(command.icon !== undefined ? { icon: normalizeIcon(command.icon) } : {}),
		...(command.group !== undefined ? { group: command.group } : {}),
		...(command.newTab === true ? { newTab: true } : {}),
		...(command.keywords?.length ? { keywords: command.keywords } : {}),
	};
}
