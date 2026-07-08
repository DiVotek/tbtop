/**
 * Shared theme state for the profile menu and the standalone header toggle.
 * Persists the choice in a cookie and applies the `.dark` class; both entry
 * points stay in sync because they read and write the same cookie.
 */
export type Theme = "light" | "dark" | "system";

export const THEMES: Theme[] = ["light", "dark", "system"];

const THEME_COOKIE = "tbtop_theme";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function readThemeCookie(fallback: Theme): Theme {
	const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${THEME_COOKIE}=([^;]*)`));
	const value = match?.[1];
	if (value === "light" || value === "dark" || value === "system") {
		return value;
	}
	return fallback;
}

export function writeThemeCookie(theme: Theme): void {
	document.cookie = `${THEME_COOKIE}=${theme}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
}

export function applyTheme(theme: Theme, enabled: boolean): void {
	if (!enabled) {
		document.documentElement.classList.remove("dark");
		return;
	}
	const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
	const isDark = theme === "dark" || (theme === "system" && prefersDark);
	document.documentElement.classList.toggle("dark", isDark);
}

/** Next theme in the light → dark → system → light cycle. */
export function nextTheme(theme: Theme): Theme {
	const at = THEMES.indexOf(theme);
	return THEMES[(at + 1) % THEMES.length] ?? "light";
}
