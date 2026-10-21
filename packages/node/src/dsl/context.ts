import { AsyncLocalStorage } from "node:async_hooks";

/**
 * What PHP reads from config(), Gate and the current panel, scoped to one
 * request. Outside a request (tests, scripts) the defaults apply.
 */
export interface AdminContext {
	contentLocales: string[];
	defaultContentLocale: string;
	/** Panel-wide default for a form's unsaved-changes guard. */
	unsavedGuard: boolean;
	/** IANA zone the server formats dates in (config app.timezone). */
	timezone: string;
	/** Gate::allows for authorize(): a named ability, optionally with arguments. */
	can: (ability: string, args: unknown[]) => boolean;
	user: unknown;
	/** Translated server strings by key (`action.save`); English is the fallback. */
	messages: Record<string, string>;
}

const DEFAULTS: AdminContext = {
	contentLocales: ["en"],
	defaultContentLocale: "en",
	unsavedGuard: true,
	timezone: "UTC",
	can: () => false,
	user: null,
	messages: {},
};

const storage = new AsyncLocalStorage<AdminContext>();
const abilities = new Map<string, (user: unknown, ...args: unknown[]) => boolean>();

export function currentContext(): AdminContext {
	return storage.getStore() ?? { ...DEFAULTS, can: gateAllows };
}

export function runWithContext<T>(context: Partial<AdminContext>, run: () => T): T {
	return storage.run({ ...DEFAULTS, can: gateAllows, ...context }, run);
}

/** Gate::define: a named ability the default `can` resolves against the current user. */
export function defineAbility(
	name: string,
	check: (user: unknown, ...args: unknown[]) => boolean,
): void {
	abilities.set(name, check);
}

function gateAllows(ability: string, args: unknown[]): boolean {
	const check = abilities.get(ability);
	return check !== undefined && check(currentContext().user, ...args);
}

/** The default content locale, falling back to the first configured one. */
export function defaultLocale(context: AdminContext = currentContext()): string {
	const { contentLocales, defaultContentLocale } = context;
	return contentLocales.includes(defaultContentLocale)
		? defaultContentLocale
		: (contentLocales[0] ?? "en");
}
