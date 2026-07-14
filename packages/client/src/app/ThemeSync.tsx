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
