import en from "../lang/en.json";
import uk from "../lang/uk.json";
import { currentContext } from "./dsl/context";

/**
 * `tbtop-admin::admin` per locale, flattened to dot keys. Generated from the
 * PHP package's lang files by `bun run sync:lang`; never edit by hand.
 */
export const BUNDLED_MESSAGES: Record<string, Record<string, string>> = { en, uk };

/** __('tbtop-admin::admin.<key>', $replace): the request's messages, then English, then the key. */
export function trans(key: string, replace: Record<string, string | number> = {}): string {
	const template = currentContext().messages[key] ?? BUNDLED_MESSAGES.en?.[key] ?? key;
	return Object.entries(replace).reduce(
		(text, [name, value]) => text.replaceAll(`:${name}`, String(value)),
		template,
	);
}
