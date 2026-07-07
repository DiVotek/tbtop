import { MonitorIcon, MoonIcon, SunIcon } from "lucide-react";
import { type ReactNode, useCallback, useEffect, useState } from "react";
import { useTranslation } from "../i18n/i18n";
import { useChromeData } from "./chromeContext";
import { applyTheme, nextTheme, readThemeCookie, type Theme, writeThemeCookie } from "./theme";

const ICONS: Record<Theme, ReactNode> = {
	light: <SunIcon className="size-5" aria-hidden />,
	dark: <MoonIcon className="size-5" aria-hidden />,
	system: <MonitorIcon className="size-5" aria-hidden />,
};

/**
 * Standalone header theme toggle (chrome block kind `themeToggle`). One
 * click cycles light → dark → system. Shares cookie state with the profile
 * menu, so both reflect the same choice. Hidden when dark mode is disabled.
 */
export function ThemeToggle() {
	const t = useTranslation();
	const { darkMode = true, defaultTheme = "system" } = useChromeData();
	const [theme, setThemeState] = useState<Theme>(() => readThemeCookie(defaultTheme));

	const cycle = useCallback(() => {
		const next = nextTheme(theme);
		setThemeState(next);
		writeThemeCookie(next);
		applyTheme(next, darkMode);
	}, [theme, darkMode]);

	useEffect(() => {
		applyTheme(theme, darkMode);
	}, [theme, darkMode]);

	if (!darkMode) {
		return null;
	}

	return (
		<button
			type="button"
			aria-label={t("nav.theme")}
			className="flex size-9 items-center justify-center rounded-md hover:bg-accent"
			data-testid="theme-toggle"
			data-theme-mode={theme}
			onClick={cycle}
		>
			{ICONS[theme]}
		</button>
	);
}
