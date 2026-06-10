import { afterEach, beforeEach, expect, test } from "bun:test";
import { act, render, waitFor } from "@testing-library/react";
import { defaultMessages, I18nProvider, useLocale, useTranslation } from "./i18n";

function Probe({ k, fallback }: { k: string; fallback?: string }) {
	const t = useTranslation();
	return <span data-testid="out">{t(k, fallback)}</span>;
}

function LocaleProbe() {
	const { locale, setLocale, available } = useLocale();
	return (
		<div>
			<span data-testid="locale">{locale}</span>
			<span data-testid="available">{available.join(",")}</span>
			{available.map((code) => (
				<button
					key={code}
					type="button"
					data-testid={`switch-${code}`}
					onClick={() => setLocale(code)}
				>
					{code}
				</button>
			))}
			<button type="button" data-testid="switch-bogus" onClick={() => setLocale("fr")}>
				bogus
			</button>
		</div>
	);
}

beforeEach(() => {
	window.localStorage.clear();
});

afterEach(() => {
	window.localStorage.clear();
});

test("i18n returns built-in defaultMessages when no languages configured", async () => {
	const { getByTestId } = render(
		<I18nProvider>
			<Probe k="action.save" />
		</I18nProvider>,
	);
	await waitFor(() => expect(getByTestId("out").textContent).toBe("Save"));
});

test("i18n returns fallback arg when key is missing everywhere", async () => {
	const { getByTestId } = render(
		<I18nProvider>
			<Probe k="unknown.key" fallback="Fallback" />
		</I18nProvider>,
	);
	await waitFor(() => expect(getByTestId("out").textContent).toBe("Fallback"));
});

test("i18n returns the key itself when nothing resolves", async () => {
	const { getByTestId } = render(
		<I18nProvider>
			<Probe k="unknown.key" />
		</I18nProvider>,
	);
	await waitFor(() => expect(getByTestId("out").textContent).toBe("unknown.key"));
});

test("i18n loads default-language messages eagerly and serves them", async () => {
	const { getByTestId } = render(
		<I18nProvider
			defaultLang="en"
			languages={{ en: async () => ({ "action.save": "SaveEN" }) }}
		>
			<Probe k="action.save" />
		</I18nProvider>,
	);
	await waitFor(() => expect(getByTestId("out").textContent).toBe("SaveEN"));
});

test("i18n active-locale messages override default-language messages", async () => {
	const { getByTestId } = render(
		<I18nProvider
			defaultLang="en"
			languages={{
				en: async () => ({ "action.save": "SaveEN" }),
				uk: async () => ({ "action.save": "Зберегти" }),
			}}
		>
			<LocaleProbe />
			<Probe k="action.save" />
		</I18nProvider>,
	);
	await waitFor(() => expect(getByTestId("out").textContent).toBe("SaveEN"));
	await act(async () => {
		getByTestId("switch-uk").click();
	});
	await waitFor(() => expect(getByTestId("out").textContent).toBe("Зберегти"));
});

test("i18n falls back to default-language messages when active locale lacks the key", async () => {
	const { getByTestId } = render(
		<I18nProvider
			defaultLang="en"
			languages={{
				en: async () => ({ "action.save": "SaveEN", "action.cancel": "CancelEN" }),
				uk: async () => ({ "action.save": "Зберегти" }),
			}}
		>
			<LocaleProbe />
			<Probe k="action.cancel" />
		</I18nProvider>,
	);
	await act(async () => {
		getByTestId("switch-uk").click();
	});
	await waitFor(() => expect(getByTestId("out").textContent).toBe("CancelEN"));
});

test("i18n accepts loaders that return a module-shaped default export", async () => {
	const { getByTestId } = render(
		<I18nProvider
			defaultLang="en"
			languages={{ en: async () => ({ default: { "action.save": "FromDefault" } }) }}
		>
			<Probe k="action.save" />
		</I18nProvider>,
	);
	await waitFor(() => expect(getByTestId("out").textContent).toBe("FromDefault"));
});

test("i18n merges plugin messages under consumer overrides for the same locale", async () => {
	const { getByTestId } = render(
		<I18nProvider
			defaultLang="en"
			languages={{ en: async () => ({ "billing.invoice": "ConsumerInvoice" }) }}
			pluginMessages={{
				en: { "billing.invoice": "PluginInvoice", "billing.total": "Total" },
			}}
		>
			<Probe k="billing.invoice" />
		</I18nProvider>,
	);
	await waitFor(() => expect(getByTestId("out").textContent).toBe("ConsumerInvoice"));
});

test("i18n exposes plugin-only keys when consumer doesn't override them", async () => {
	const { getByTestId } = render(
		<I18nProvider
			defaultLang="en"
			languages={{ en: async () => ({}) }}
			pluginMessages={{ en: { "billing.total": "Total" } }}
		>
			<Probe k="billing.total" />
		</I18nProvider>,
	);
	await waitFor(() => expect(getByTestId("out").textContent).toBe("Total"));
});

test("i18n persists the active locale to localStorage on switch", async () => {
	const { getByTestId } = render(
		<I18nProvider defaultLang="en" languages={{ en: async () => ({}), uk: async () => ({}) }}>
			<LocaleProbe />
		</I18nProvider>,
	);
	await act(async () => {
		getByTestId("switch-uk").click();
	});
	expect(window.localStorage.getItem("tbtop:locale")).toBe("uk");
});

test("i18n restores the stored locale on mount when it's available", async () => {
	window.localStorage.setItem("tbtop:locale", "uk");
	const { getByTestId } = render(
		<I18nProvider
			defaultLang="en"
			languages={{
				en: async () => ({ "action.save": "SaveEN" }),
				uk: async () => ({ "action.save": "Зберегти" }),
			}}
		>
			<LocaleProbe />
			<Probe k="action.save" />
		</I18nProvider>,
	);
	expect(getByTestId("locale").textContent).toBe("uk");
	await waitFor(() => expect(getByTestId("out").textContent).toBe("Зберегти"));
});

test("i18n ignores stored locale when not in configured languages", async () => {
	window.localStorage.setItem("tbtop:locale", "fr");
	const { getByTestId } = render(
		<I18nProvider defaultLang="en" languages={{ en: async () => ({}) }}>
			<LocaleProbe />
		</I18nProvider>,
	);
	expect(getByTestId("locale").textContent).toBe("en");
});

test("i18n setLocale rejects locales not in the available list", async () => {
	const { getByTestId } = render(
		<I18nProvider defaultLang="en" languages={{ en: async () => ({}) }}>
			<LocaleProbe />
		</I18nProvider>,
	);
	await act(async () => {
		getByTestId("switch-bogus").click();
	});
	expect(getByTestId("locale").textContent).toBe("en");
	expect(window.localStorage.getItem("tbtop:locale")).toBeNull();
});

test("i18n available reflects configured languages in order", async () => {
	const { getByTestId } = render(
		<I18nProvider
			defaultLang="en"
			languages={{ en: async () => ({}), uk: async () => ({}), pl: async () => ({}) }}
		>
			<LocaleProbe />
		</I18nProvider>,
	);
	expect(getByTestId("available").textContent).toBe("en,uk,pl");
});

test("i18n keeps the previous resolved state when a locale loader rejects", async () => {
	const errors: unknown[] = [];
	const originalError = console.error;
	console.error = (...args: unknown[]) => {
		errors.push(args);
	};
	try {
		const { getByTestId } = render(
			<I18nProvider
				defaultLang="en"
				languages={{
					en: async () => ({ "action.save": "SaveEN" }),
					uk: async () => {
						throw new Error("network down");
					},
				}}
			>
				<LocaleProbe />
				<Probe k="action.save" />
			</I18nProvider>,
		);
		await waitFor(() => expect(getByTestId("out").textContent).toBe("SaveEN"));
		await act(async () => {
			getByTestId("switch-uk").click();
		});
		await waitFor(() => expect(errors.length).toBeGreaterThan(0));
		expect(getByTestId("out").textContent).toBe("SaveEN");
	} finally {
		console.error = originalError;
	}
});

test("i18n defaultMessages includes the documented A1 keys", () => {
	expect(defaultMessages["action.save"]).toBeDefined();
	expect(defaultMessages["action.cancel"]).toBeDefined();
	expect(defaultMessages["action.delete"]).toBeDefined();
	expect(defaultMessages["action.create"]).toBeDefined();
	expect(defaultMessages["auth.login.title"]).toBeDefined();
	expect(defaultMessages["state.notFound"]).toBeDefined();
	expect(defaultMessages["state.forbidden"]).toBeDefined();
	expect(defaultMessages["state.loading"]).toBeDefined();
});

test("i18n table.selected_count uses {count} placeholder so .replace works in tableBlock", () => {
	// The PHP lang files historically used :count (Laravel convention) but the
	// client consumer calls t("table.selected_count").replace("{count}", n).
	// Both the defaultMessages and any loaded lang file must use {count}.
	expect(defaultMessages["table.selected_count"]).toContain("{count}");
});

test("i18n pluginMessages with {count} placeholder interpolates correctly via replace", async () => {
	// Simulates a lang file returning the correct {count} placeholder.
	const { getByTestId } = render(
		<I18nProvider
			defaultLang="en"
			languages={{
				en: async () => ({ "table.selected_count": "{count} selected" }),
			}}
		>
			<Probe k="table.selected_count" />
		</I18nProvider>,
	);
	await waitFor(() =>
		expect(getByTestId("out").textContent?.replace("{count}", "3")).toBe("3 selected"),
	);
});
