import type { ReactNode } from "react";
import { Badge } from "../ui/badge";
import { Tabs, TabsList, TabsTrigger } from "../ui/tabs";
import { useActiveLocale } from "./contentLocaleContext";

interface LocaleBarProps {
	locales: string[];
	/** fieldErrors keyed by `fieldName.locale` */
	fieldErrors: Record<string, string>;
}

/**
 * Form-level content locale tab bar. Rendered once per form when the form
 * contains at least one translatable field. Manages active locale state
 * via ActiveLocaleCtx — does not mount/unmount field panels itself.
 */
export function ContentLocaleBar({ locales, fieldErrors }: LocaleBarProps): ReactNode {
	const ctx = useActiveLocale();
	if (!ctx || locales.length <= 1) {
		return null;
	}
	const { active, setActive } = ctx;
	return (
		<Tabs value={active} onValueChange={setActive}>
			<TabsList data-testid="content-locale-bar">
				{locales.map((locale) => (
					<LocaleTab
						key={locale}
						locale={locale}
						errorCount={countLocaleErrors(locale, fieldErrors)}
					/>
				))}
			</TabsList>
		</Tabs>
	);
}

function LocaleTab({ locale, errorCount }: { locale: string; errorCount: number }): ReactNode {
	return (
		<TabsTrigger value={locale} data-testid={`locale-tab-${locale}`}>
			{locale}
			{errorCount > 0 && (
				<Badge
					variant="destructive"
					className="ml-1 h-4 min-w-4 rounded-full px-1 text-[10px]"
					data-testid={`locale-error-badge-${locale}`}
				>
					{errorCount}
				</Badge>
			)}
		</TabsTrigger>
	);
}

function countLocaleErrors(locale: string, errors: Record<string, string>): number {
	const suffix = `.${locale}`;
	return Object.keys(errors).filter((k) => k.endsWith(suffix)).length;
}
