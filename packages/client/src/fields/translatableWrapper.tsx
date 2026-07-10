import { createContext, type ReactNode, useContext } from "react";
import { useActiveLocale } from "../structure/contentLocaleContext";
import type { FieldFormProps } from "./fieldProps";

type LocaleMap = Record<string, unknown>;

// Tells an inner field which locale panel it is mounted in. Distinct from
// ActiveLocaleContext (which locale panel is currently VISIBLE): every panel
// is mounted regardless of visibility, and each one needs to know its OWN
// locale — e.g. a slug field resolving a translatable source field must read
// `${fromField}.${panelLocale}`, not the currently active tab's locale.
const PanelLocaleCtx = createContext<string | null>(null);

export function PanelLocaleProvider({ locale, children }: { locale: string; children: ReactNode }) {
	return <PanelLocaleCtx.Provider value={locale}>{children}</PanelLocaleCtx.Provider>;
}

/** The content locale of the translatable panel this field is mounted in, if any. */
export function usePanelLocale(): string | null {
	return useContext(PanelLocaleCtx);
}

interface TranslatableWrapperProps {
	name: string;
	id?: string;
	value: LocaleMap | null;
	onChange: (next: LocaleMap | null) => void;
	onBlur?: () => void;
	options?: Record<string, unknown>;
	/**
	 * Render function, NOT a component type: it is invoked, never mounted,
	 * so a fresh closure per parent render cannot change element identity
	 * and remount the inner field (which would drop focus on every keystroke).
	 */
	renderInner: (props: FieldFormProps<unknown>) => ReactNode;
	locales: string[];
}

/**
 * Renders one instance of the inner field component per content locale,
 * keeping all locales MOUNTED. Only the active locale panel is visible —
 * others are display:none so state is preserved on tab switch.
 *
 * Value shape: { en: <inner>, uk: <inner>, ... }
 * Empty locale = null on submit.
 */
export function TranslatableWrapper({
	name,
	id,
	value,
	onChange,
	onBlur,
	options,
	renderInner,
	locales,
}: TranslatableWrapperProps) {
	const ctx = useActiveLocale();
	const active = ctx?.active ?? locales[0] ?? "en";

	return (
		<>
			{locales.map((locale) =>
				renderLocalePanel({
					locale,
					active,
					name,
					id,
					value,
					onChange,
					onBlur,
					options,
					renderInner,
				}),
			)}
		</>
	);
}

interface PanelInput {
	locale: string;
	active: string;
	name: string;
	id?: string;
	value: LocaleMap | null;
	onChange: (next: LocaleMap | null) => void;
	onBlur?: () => void;
	options?: Record<string, unknown>;
	renderInner: (props: FieldFormProps<unknown>) => ReactNode;
}

function renderLocalePanel(input: PanelInput) {
	const { locale, active, name, id, value, onChange, onBlur, options, renderInner } = input;
	const localeId = id ? `${id}-${locale}` : `${name}-${locale}`;
	const localeValue = (value?.[locale] ?? null) as unknown;
	const handleChange = (next: unknown) => {
		const current = value ?? {};
		onChange({ ...current, [locale]: next ?? null });
	};

	const props: FieldFormProps<unknown> = {
		id: localeId,
		name: `${name}.${locale}`,
		value: localeValue,
		onChange: handleChange,
		onBlur,
		options,
	};

	return (
		<div
			key={locale}
			data-locale={locale}
			style={locale !== active ? { display: "none" } : undefined}
		>
			<PanelLocaleProvider locale={locale}>{renderInner(props)}</PanelLocaleProvider>
		</div>
	);
}
