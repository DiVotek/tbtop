import { type AdminContext, currentContext } from "../dsl";
import { BUNDLED_MESSAGES } from "../i18n";
import { readBody } from "./http";
import { back } from "./inertia/protocol";
import type { SessionStore } from "./inertia/session";

/** The session key LocaleController writes (`tbtop.locale`). */
export const SESSION_LOCALE = "tbtop.locale";

export interface LocaleConfig {
	/** UI locales of the panel; default `["en"]`. */
	locales?: string[];
	/** Default UI locale; default the first of `locales`. */
	locale?: string;
	/** Host strings per locale, over the bundled `tbtop-admin::admin` ones (extra locales too). */
	messages?: Record<string, Record<string, string>>;
	/** Validation templates per locale by rule (`required`, `max.string`), e.g. from laravel-lang. */
	validationMessages?: Record<string, Record<string, string>>;
	/** Content locales of translatable fields; default `["en"]`. */
	contentLocales?: string[];
	defaultContentLocale?: string;
	/**
	 * The signed-in user's saved UI locale (e.g. a profile column), read before
	 * the session's pick; null or a locale the panel lacks falls through.
	 */
	userLocale?: (user: unknown) => string | null | Promise<string | null>;
	/** Called after a valid switch in the user menu, to save the pick for the user. */
	onLocaleChange?: (user: unknown, locale: string) => void | Promise<void>;
}

export function uiLocales(config: LocaleConfig): string[] {
	return config.locales ?? ["en"];
}

/**
 * LocaleService::currentLocale(): the user's saved locale, then the session's
 * pick, when the panel offers it; else the default.
 */
export async function currentLocale(
	config: LocaleConfig,
	session: SessionStore,
	user: unknown = null,
): Promise<string> {
	const available = uiLocales(config);
	const saved = user !== null && config.userLocale ? await config.userLocale(user) : null;
	const stored = await session.get(SESSION_LOCALE);
	const pick = [saved, stored].find((l) => typeof l === "string" && available.includes(l));
	return (pick as string | undefined) ?? config.locale ?? available[0] ?? "en";
}

/** The request-context half of i18n: what trans() and the validator read. */
export function localeContext(config: LocaleConfig, locale: string): Partial<AdminContext> {
	const content = config.contentLocales ?? ["en"];
	return {
		locale,
		messages: { ...BUNDLED_MESSAGES[locale], ...config.messages?.[locale] },
		validationMessages: config.validationMessages?.[locale] ?? {},
		contentLocales: content,
		defaultContentLocale: config.defaultContentLocale ?? content[0] ?? "en",
	};
}

/** POST {prefix}/locale (LocaleController): validate against the panel, store, back. */
export async function switchLocale(
	config: LocaleConfig,
	request: Request,
	session: SessionStore,
): Promise<Response> {
	const { locale } = await readBody(request);
	if (typeof locale === "string" && uiLocales(config).includes(locale)) {
		await session.set(SESSION_LOCALE, locale);
		const user = currentContext().user ?? null;
		if (user !== null) {
			await config.onLocaleChange?.(user, locale);
		}
	} else {
		await session.set("errors", { locale: "The selected locale is invalid." });
	}
	return back(request, new URL(request.url).pathname.replace(/\/locale$/, ""));
}
