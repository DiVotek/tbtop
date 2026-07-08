export type ThemeMode = "light" | "dark" | "system";

/** Shell density: "compact" tightens control heights, spacing, and the sidebar width. */
export type Density = "default" | "compact";

/**
 * Panel appearance shared prop (tbtop.appearance). Sparse — only keys the
 * author changed from the default are present. Colors / radius / fonts are
 * NOT here: tbtop uses shadcn theme tokens, so you theme by pasting a shadcn
 * preset into your app CSS (docs/ai/recipes.md → Theming).
 */
export interface Appearance {
	/** false disables the theme toggle entirely (shell stays light). */
	darkMode?: boolean;
	/** Initial theme when the visitor has no saved preference. */
	defaultTheme?: ThemeMode;
	/** Tailwind max-w token the page content is centered to. */
	maxWidth?: string;
	/** Shell density; undefined behaves as "default". */
	density?: Density;
}

// Static token → class map so Tailwind keeps these utilities in the build
// (a dynamic `max-w-${token}` would be purged). Look up inline:
//   appearance.maxWidth ? MAX_WIDTH_CLASS[appearance.maxWidth] : undefined
export const MAX_WIDTH_CLASS: Record<string, string> = {
	sm: "max-w-sm",
	md: "max-w-md",
	lg: "max-w-lg",
	xl: "max-w-xl",
	"2xl": "max-w-2xl",
	"3xl": "max-w-3xl",
	"4xl": "max-w-4xl",
	"5xl": "max-w-5xl",
	"6xl": "max-w-6xl",
	"7xl": "max-w-7xl",
	full: "max-w-full",
	prose: "max-w-prose",
};
