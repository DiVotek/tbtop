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
	};
	return Object.keys(out).length > 0 ? out : null;
}
