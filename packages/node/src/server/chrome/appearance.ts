const MAX_WIDTHS = [
	"sm",
	"md",
	"lg",
	"xl",
	"2xl",
	"3xl",
	"4xl",
	"5xl",
	"6xl",
	"7xl",
	"full",
	"prose",
] as const;

/** Upstream shadcn styles shipped in the client's styles.css. */
export const STYLE_PRESETS = [
	"vega",
	"nova",
	"maia",
	"lyra",
	"mira",
	"luma",
	"sera",
	"rhea",
] as const;
export type StylePreset = (typeof STYLE_PRESETS)[number];
export const DEFAULT_STYLE_PRESET: StylePreset = "vega";

export const NAVIGATIONS = ["sidebar", "topbar", "topbar-sidebar", "rail-sidebar"] as const;
export type NavigationLayout = (typeof NAVIGATIONS)[number];

/**
 * ConfiguresAppearance: what CSS alone can't say. Colors, radius and fonts
 * are shadcn theme tokens in the host's CSS, not config.
 */
export interface AppearanceConfig {
	/** Allow the dark-mode toggle (default true). */
	darkMode?: boolean;
	/** Theme for a visitor with no saved preference (default `system`). */
	defaultThemeMode?: "light" | "dark" | "system";
	/** Center page content to a Tailwind max-w token. */
	maxContentWidth?: (typeof MAX_WIDTHS)[number];
	/** `compact` tightens control heights, spacing and the sidebar. */
	density?: "default" | "compact";
	/**
	 * Component style from ui.shadcn.com/create (default `vega`): sizes, spacing,
	 * radii and shadows. `rootView()` puts its `style-preset-<name>` class on `<html>`.
	 */
	stylePreset?: StylePreset;
}

function oneOf(value: string | undefined, allowed: readonly string[], what: string): void {
	if (value !== undefined && !allowed.includes(value)) {
		throw new TypeError(`Unknown ${what} "${value}". Expected one of: ${allowed.join(", ")}.`);
	}
}

/** The setters' checks, at createAdmin() for a host without the types. */
export function assertAppearance(navigation?: string, appearance: AppearanceConfig = {}): void {
	oneOf(navigation, NAVIGATIONS, "navigation");
	oneOf(appearance.defaultThemeMode, ["light", "dark", "system"], "theme mode");
	oneOf(appearance.maxContentWidth, MAX_WIDTHS, "max content width");
	oneOf(appearance.density, ["default", "compact"], "density");
	oneOf(appearance.stylePreset, STYLE_PRESETS, "style preset");
}

/** The sparse `tbtop.appearance` prop: only what differs from the defaults; null when nothing does. */
export function appearanceProp(appearance: AppearanceConfig = {}): Record<string, unknown> | null {
	const out = {
		...(appearance.darkMode === false ? { darkMode: false } : {}),
		...(appearance.defaultThemeMode !== undefined && appearance.defaultThemeMode !== "system"
			? { defaultTheme: appearance.defaultThemeMode }
			: {}),
		...(appearance.maxContentWidth !== undefined
			? { maxWidth: appearance.maxContentWidth }
			: {}),
		...(appearance.density === "compact" ? { density: "compact" } : {}),
		...(appearance.stylePreset !== undefined && appearance.stylePreset !== DEFAULT_STYLE_PRESET
			? { stylePreset: appearance.stylePreset }
			: {}),
	};
	return Object.keys(out).length > 0 ? out : null;
}
