import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";
import { defaultMessages, type Messages } from "./defaultMessages";
import { type LocaleLoader, loadMessages } from "./loadMessages";
import { readStoredLocale, writeStoredLocale } from "./localeStorage";

export type { Messages } from "./defaultMessages";
export { defaultMessages } from "./defaultMessages";
export type { LocaleLoader } from "./loadMessages";

export type Translate = (key: string, fallback?: string) => string;

export type PluginMessages = Record<string, Messages>;

export type I18nState = {
	locale: string;
	setLocale: (locale: string) => void;
	available: string[];
};

type ResolvedMessages = {
	active: Messages;
	fallback: Messages;
};

const BUILTIN_DEFAULT_LANG = "en";

const TranslateContext = createContext<Translate | undefined>(undefined);
const LocaleContext = createContext<I18nState | undefined>(undefined);

export function I18nProvider({
	locale: serverLocale,
	defaultLang,
	languages,
	pluginMessages,
	onLocaleChange,
	children,
}: {
	/**
	 * The locale the server actually resolved messages for. When set, it wins
	 * over the stored preference and is mirrored back to localStorage — the
	 * stored value is just a hint, while this is the only locale whose
	 * translations are guaranteed present. Without this, a stale stored
	 * preference (e.g. a session recreated by remember-login without the
	 * locale key) makes the switcher show one locale while every string
	 * silently renders from the fallback.
	 */
	locale?: string;
	defaultLang?: string;
	languages?: Record<string, LocaleLoader>;
	pluginMessages?: PluginMessages;
	onLocaleChange?: (locale: string) => void;
	children: ReactNode;
}) {
	const fallbackLang = defaultLang ?? BUILTIN_DEFAULT_LANG;
	const available = useMemo(() => Object.keys(languages ?? {}), [languages]);
	const resolvedServerLocale =
		serverLocale && (available.length === 0 || available.includes(serverLocale))
			? serverLocale
			: undefined;
	const initialLocale = resolvedServerLocale ?? pickInitialLocale(available, fallbackLang);

	const [locale, setLocaleState] = useState(initialLocale);

	// Follows later prop changes too, not just the mount: the admin shell is
	// an Inertia persistent layout, so a session recreated mid-navigation
	// swaps the server locale without remounting this provider.
	useEffect(() => {
		if (resolvedServerLocale) {
			writeStoredLocale(resolvedServerLocale);
			setLocaleState(resolvedServerLocale);
		}
	}, [resolvedServerLocale]);

	const [resolved, setResolved] = useState<ResolvedMessages>(() => ({
		active: pluginMessages?.[initialLocale] ?? {},
		fallback: pluginMessages?.[fallbackLang] ?? {},
	}));

	useEffect(() => {
		let cancelled = false;
		void hydrateMessages({
			locale,
			fallbackLang,
			languages,
			pluginMessages,
			onResolved: (next) => {
				if (!cancelled) {
					setResolved(next);
				}
			},
		});
		return () => {
			cancelled = true;
		};
	}, [locale, fallbackLang, languages, pluginMessages]);

	const setLocale = useCallback(
		(next: string) => {
			if (!available.includes(next)) {
				return;
			}
			writeStoredLocale(next);
			setLocaleState(next);
			onLocaleChange?.(next);
		},
		[available, onLocaleChange],
	);

	const translate = useMemo<Translate>(
		() => (key, fallback) =>
			resolved.active[key] ??
			resolved.fallback[key] ??
			defaultMessages[key] ??
			fallback ??
			key,
		[resolved],
	);

	const localeState = useMemo<I18nState>(
		() => ({ locale, setLocale, available }),
		[locale, setLocale, available],
	);

	return (
		<LocaleContext.Provider value={localeState}>
			<TranslateContext.Provider value={translate}>{children}</TranslateContext.Provider>
		</LocaleContext.Provider>
	);
}

export function useTranslation(): Translate {
	const translate = useContext(TranslateContext);
	if (translate) {
		return translate;
	}
	return (key, fallback) => defaultMessages[key] ?? fallback ?? key;
}

export function useLocale(): I18nState {
	const state = useContext(LocaleContext);
	if (state) {
		return state;
	}
	return { locale: BUILTIN_DEFAULT_LANG, setLocale: noopSetLocale, available: [] };
}

function noopSetLocale(): void {}

function pickInitialLocale(available: string[], fallbackLang: string): string {
	if (available.length === 0) {
		return fallbackLang;
	}
	const stored = readStoredLocale();
	if (stored && available.includes(stored)) {
		return stored;
	}
	if (available.includes(fallbackLang)) {
		return fallbackLang;
	}
	return available[0] ?? fallbackLang;
}

async function hydrateMessages({
	locale,
	fallbackLang,
	languages,
	pluginMessages,
	onResolved,
}: {
	locale: string;
	fallbackLang: string;
	languages: Record<string, LocaleLoader> | undefined;
	pluginMessages: PluginMessages | undefined;
	onResolved: (next: ResolvedMessages) => void;
}): Promise<void> {
	try {
		const [activeConsumer, fallbackConsumer] = await Promise.all([
			loadIfPresent(languages?.[locale]),
			locale === fallbackLang
				? Promise.resolve({})
				: loadIfPresent(languages?.[fallbackLang]),
		]);
		onResolved({
			active: { ...pluginMessages?.[locale], ...activeConsumer },
			fallback: { ...pluginMessages?.[fallbackLang], ...fallbackConsumer },
		});
	} catch (err) {
		console.error(`[i18n] failed to load messages for locale "${locale}":`, err);
	}
}

async function loadIfPresent(loader: LocaleLoader | undefined): Promise<Messages> {
	if (!loader) {
		return {};
	}
	return loadMessages(loader);
}
