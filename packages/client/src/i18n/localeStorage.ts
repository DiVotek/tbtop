const LOCALE_KEY = "tbtop:locale";

export function readStoredLocale(): string | undefined {
	if (typeof window === "undefined") {
		return undefined;
	}
	try {
		return window.localStorage.getItem(LOCALE_KEY) ?? undefined;
	} catch {
		return undefined;
	}
}

export function writeStoredLocale(locale: string): void {
	if (typeof window === "undefined") {
		return;
	}
	try {
		window.localStorage.setItem(LOCALE_KEY, locale);
	} catch {
		// localStorage may be unavailable (private mode, disabled). Persistence is best-effort.
	}
}
