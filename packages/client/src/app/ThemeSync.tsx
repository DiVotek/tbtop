import { router } from "@inertiajs/react";
import { useEffect } from "react";
import { DEFAULT_STYLE_PRESET, type StylePreset } from "./appearance";
import { useChromeData } from "./chromeContext";
import { applyTheme, readThemeCookie } from "./theme";

/**
 * Applies the theme cookie at shell level — on mount and after every
 * Inertia navigation. Keeps dark mode working without a ThemeToggle
 * in the chrome, and lets a server-set cookie (a profile preference
 * saved via redirect) take effect as soon as the visit lands.
 */
export function ThemeSync() {
	const { darkMode = true, defaultTheme = "system" } = useChromeData();

	useEffect(() => {
		const apply = () => applyTheme(readThemeCookie(defaultTheme), darkMode);
		apply();
		return router.on("navigate", apply);
	}, [darkMode, defaultTheme]);

	return null;
}

/**
 * Puts the panel's style preset scope (`style-preset-<name>`) on
 * `documentElement`. Portals (dialog, select/dropdown popovers, tooltips)
 * render into `document.body`, outside any React subtree, so the scope
 * cannot live on a wrapper div. The host's root Blade sets the same class
 * server-side to avoid a first unstyled paint; this keeps it in sync.
 */
export function StylePresetSync({ preset = DEFAULT_STYLE_PRESET }: { preset?: StylePreset }) {
	useEffect(() => {
		const root = document.documentElement;
		const next = `style-preset-${preset}`;
		// classList is live: collect first, then remove.
		const stale = Array.from(root.classList).filter(
			(c) => c.startsWith("style-preset-") && c !== next,
		);
		root.classList.remove(...stale);
		root.classList.add(next);
	}, [preset]);

	return null;
}
