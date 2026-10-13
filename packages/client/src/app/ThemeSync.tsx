import { router } from "@inertiajs/react";
import { useEffect } from "react";
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
 * The active new-gen style preset scope (`style-preset-*`). Portals
 * (dialog overlay/content, select/dropdown popovers, tooltips) render into
 * `document.body` — outside any React subtree — so the scope class must live
 * on `documentElement`, not on a wrapper div. Keep in sync with the active
 * preset import in styles.css.
 */
export const STYLE_PRESET_CLASS = "style-preset-mira";

export function StylePresetSync() {
	useEffect(() => {
		const root = document.documentElement;
		const prev = [...root.classList].find((c) => c.startsWith("style-preset-"));
		if (prev && prev !== STYLE_PRESET_CLASS) {
			root.classList.remove(prev);
		}
		root.classList.add(STYLE_PRESET_CLASS);
	}, []);

	return null;
}
