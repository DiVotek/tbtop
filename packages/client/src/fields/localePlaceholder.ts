import { useContentLocaleConfig } from "../structure/contentLocaleContext";
import { usePanelLocale } from "./translatableWrapper";

/**
 * The placeholder option for this field instance: a plain string as is, or
 * from a locale map (PHP `placeholder(['en' => …])`) the entry for the
 * translatable panel the field is mounted in, else the default content locale.
 */
export function useLocalePlaceholder(raw: unknown): string | undefined {
	const panelLocale = usePanelLocale();
	const { defaultLocale } = useContentLocaleConfig();
	if (typeof raw === "string") {
		return raw;
	}
	if (raw === null || typeof raw !== "object") {
		return undefined;
	}
	const text = (raw as Record<string, unknown>)[panelLocale ?? defaultLocale];
	return typeof text === "string" ? text : undefined;
}
