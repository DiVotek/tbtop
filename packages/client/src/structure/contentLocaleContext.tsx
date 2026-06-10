import { createContext, type ReactNode, useContext, useState } from "react";

export interface ContentLocaleConfig {
	locales: string[];
	defaultLocale: string;
}

const ContentLocaleConfigCtx = createContext<ContentLocaleConfig>({
	locales: ["en"],
	defaultLocale: "en",
});

export function ContentLocaleConfigProvider({
	config,
	children,
}: {
	config: ContentLocaleConfig;
	children: ReactNode;
}) {
	return (
		<ContentLocaleConfigCtx.Provider value={config}>{children}</ContentLocaleConfigCtx.Provider>
	);
}

export function useContentLocaleConfig(): ContentLocaleConfig {
	return useContext(ContentLocaleConfigCtx);
}

// Per-form active locale state — lives inside FormControllerProvider.
const ActiveLocaleCtx = createContext<{
	active: string;
	setActive: (locale: string) => void;
} | null>(null);

export function ActiveLocaleProvider({
	defaultLocale,
	children,
}: {
	defaultLocale: string;
	children: ReactNode;
}) {
	const [active, setActive] = useState(defaultLocale);
	return (
		<ActiveLocaleCtx.Provider value={{ active, setActive }}>
			{children}
		</ActiveLocaleCtx.Provider>
	);
}

export function useActiveLocale(): { active: string; setActive: (locale: string) => void } | null {
	return useContext(ActiveLocaleCtx);
}
