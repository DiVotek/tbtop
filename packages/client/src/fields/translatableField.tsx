import { type ReactNode, useState } from "react";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import type { FieldCellProps, FieldFormProps } from "./fieldProps";

type LocaleMap = Record<string, string>;
type TranslatableOptions = { locales?: string[]; defaultLocale?: string };
type SetLocale = (locale: string, text: string) => void;
type ViewInput = {
	name: string;
	fieldId: string;
	locales: string[];
	map: LocaleMap;
	setLocale: SetLocale;
	defaultLocale?: string;
};

// Table cells show one language — first non-empty in configured order.
export function TranslatableCell({
	value,
	options,
}: FieldCellProps<LocaleMap, TranslatableOptions>): ReactNode {
	if (!value) {
		return null;
	}
	const locales = options?.locales ?? Object.keys(value);
	const found = locales.find((locale) => value[locale]);
	return found ? <span>{value[found]}</span> : null;
}

// One tab per configured locale, badge on empty translations. Single-locale
// fallback renders a bare input — tabs would be UI noise.
export function TranslatableForm({
	id,
	name,
	value,
	onChange,
	options,
}: FieldFormProps<LocaleMap, TranslatableOptions>): ReactNode {
	const locales = options?.locales ?? [];
	const map = value ?? {};
	const fieldId = id ?? name;
	const setLocale: SetLocale = (locale, text) => onChange({ ...map, [locale]: text });
	const input: ViewInput = {
		name,
		fieldId,
		locales,
		map,
		setLocale,
		defaultLocale: options?.defaultLocale,
	};
	return locales.length <= 1 ? renderSingle(input) : renderTabbed(input);
}

function renderSingle(input: ViewInput): ReactNode {
	const locale = input.locales[0] ?? "";
	return (
		<div data-field={input.name} className="flex flex-col gap-1">
			<Label htmlFor={input.fieldId}>{locale}</Label>
			<Input
				id={input.fieldId}
				type="text"
				value={input.map[locale] ?? ""}
				onChange={(e) => input.setLocale(locale, e.target.value)}
			/>
		</div>
	);
}

function renderTabbed(input: ViewInput): ReactNode {
	const initial = input.defaultLocale ?? input.locales[0] ?? "";
	return <TabbedLocales input={input} initial={initial} />;
}

function TabbedLocales({ input, initial }: { input: ViewInput; initial: string }): ReactNode {
	const [active, setActive] = useState(initial);
	return (
		<Tabs data-field={input.name} value={active} onValueChange={setActive}>
			<TabsList>{input.locales.map((locale) => renderTrigger(locale, input.map))}</TabsList>
			{input.locales.map((locale, index) => renderPanel(locale, index, input))}
		</Tabs>
	);
}

function renderTrigger(locale: string, map: LocaleMap): ReactNode {
	return (
		<TabsTrigger key={locale} value={locale}>
			{locale}
			{!map[locale] && (
				<span aria-hidden className="ml-1 text-muted-foreground">
					•
				</span>
			)}
		</TabsTrigger>
	);
}

function renderPanel(locale: string, index: number, input: ViewInput): ReactNode {
	const inputId = index === 0 ? input.fieldId : `${input.fieldId}-${locale}`;
	return (
		<TabsContent key={locale} value={locale}>
			<Input
				id={inputId}
				type="text"
				aria-label={locale}
				value={input.map[locale] ?? ""}
				onChange={(e) => input.setLocale(locale, e.target.value)}
			/>
		</TabsContent>
	);
}
