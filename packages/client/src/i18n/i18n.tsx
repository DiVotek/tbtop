import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";
import { useLatest } from "../lib/useLatest";
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

	const run = useLatest();
	useEffect(() => {
		void run(() => loadMessagesFor({ locale, fallbackLang, languages, pluginMessages }), {
			onResult: (next) => {
				setResolved((prev) => (sameMessages(prev, next) ? prev : next));
			},
			onError: (err) => {
				console.error(`[i18n] failed to load messages for locale "${locale}":`, err);
			},
		});
		return () => {
			run.cancel();
		};
	}, [locale, fallbackLang, languages, pluginMessages, run]);

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

const VALUE_PARAM_KEYS: Record<string, string> = {
	"validation.min": "min",
	"validation.max": "max",
};

/**
 * Translates a client-side validation Issue.message. compileConstraints
 * (inertia/constraints.ts) emits i18n keys instead of display text — plain
 * "validation.required", or "validation.min:5" for keys whose message needs
 * an interpolated value, since Issue.message is a plain string shared with
 * consumer-authored zod schemas (can't carry a structured params bag).
 * A message that isn't one of ours (a real zod error, or anything with no
 * matching key) round-trips unchanged: t() falls back to the key itself.
 */
export function translateValidationMessage(t: Translate, message: string): string {
	const sepIndex = message.indexOf(":");
	if (sepIndex === -1) {
		return t(message);
	}
	const key = message.slice(0, sepIndex);
	const value = message.slice(sepIndex + 1);
	const param = VALUE_PARAM_KEYS[key];
	if (!param) {
		return t(message);
	}
	return t(key).replace(`{${param}}`, value);
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

// Hydration always allocates fresh objects, so identity alone would mark every
// mount as a change and rebuild consumers' memoized query closures.
function sameMessages(a: ResolvedMessages, b: ResolvedMessages): boolean {
	const sameBag = (x: Messages, y: Messages) => {
		const keys = Object.keys(x);
		return keys.length === Object.keys(y).length && keys.every((key) => x[key] === y[key]);
	};
	return sameBag(a.active, b.active) && sameBag(a.fallback, b.fallback);
}

async function loadMessagesFor({
	locale,
	fallbackLang,
	languages,
	pluginMessages,
}: {
	locale: string;
	fallbackLang: string;
	languages: Record<string, LocaleLoader> | undefined;
	pluginMessages: PluginMessages | undefined;
}): Promise<ResolvedMessages> {
	const [activeConsumer, fallbackConsumer] = await Promise.all([
		loadIfPresent(languages?.[locale]),
		locale === fallbackLang ? Promise.resolve({}) : loadIfPresent(languages?.[fallbackLang]),
	]);
	return {
		active: { ...pluginMessages?.[locale], ...activeConsumer },
		fallback: { ...pluginMessages?.[fallbackLang], ...fallbackConsumer },
	};
}

async function loadIfPresent(loader: LocaleLoader | undefined): Promise<Messages> {
	if (!loader) {
		return {};
	}
	return loadMessages(loader);
}
