import { afterEach, beforeEach, expect, test } from "bun:test";
import { act, render, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nProvider } from "./i18n";
import { LanguageSwitcher } from "./LanguageSwitcher";

beforeEach(() => {
	window.localStorage.clear();
});

afterEach(() => {
	window.localStorage.clear();
});

test("LanguageSwitcher hides when fewer than two languages are configured", () => {
	const { queryByTestId } = render(
		<I18nProvider defaultLang="en" languages={{ en: async () => ({}) }}>
			<LanguageSwitcher />
		</I18nProvider>,
	);
	expect(queryByTestId("language-switcher")).toBeNull();
});

test("LanguageSwitcher renders when two or more languages are configured", () => {
	const { getByTestId } = render(
		<I18nProvider defaultLang="en" languages={{ en: async () => ({}), uk: async () => ({}) }}>
			<LanguageSwitcher />
		</I18nProvider>,
	);
	expect(getByTestId("language-switcher")).toBeTruthy();
});

test("LanguageSwitcher notifies onLocaleChange so the server session can persist", async () => {
	const user = userEvent.setup();
	const changes: string[] = [];
	const { getByTestId, findByText } = render(
		<I18nProvider
			defaultLang="en"
			languages={{ en: async () => ({}), uk: async () => ({}) }}
			onLocaleChange={(locale) => changes.push(locale)}
		>
			<LanguageSwitcher />
		</I18nProvider>,
	);
	await user.click(getByTestId("language-switcher"));
	const ukOption = await findByText(/^(Українська|Ukrainian)$/);
	await act(async () => {
		await user.click(ukOption);
	});
	await waitFor(() => expect(changes).toEqual(["uk"]));
});

test("LanguageSwitcher lists every configured language and switches on click", async () => {
	const user = userEvent.setup();
	const { getByTestId, findByText } = render(
		<I18nProvider defaultLang="en" languages={{ en: async () => ({}), uk: async () => ({}) }}>
			<LanguageSwitcher />
		</I18nProvider>,
	);
	await user.click(getByTestId("language-switcher"));
	const ukOption = await findByText(/^(Українська|Ukrainian)$/);
	await act(async () => {
		await user.click(ukOption);
	});
	await waitFor(() => expect(window.localStorage.getItem("tbtop:locale")).toBe("uk"));
});
