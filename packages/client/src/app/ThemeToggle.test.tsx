import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { fireEvent, render } from "@testing-library/react";
import type { ReactNode } from "react";
import { I18nProvider } from "../i18n/i18n";
import { type ChromeData, ChromeDataContext } from "./chromeContext";
import { ThemeToggle } from "./ThemeToggle";

const BASE: ChromeData = {
	nav: [],
	user: null,
	currentUrl: "/",
	brand: null,
	orientation: "vertical",
	darkMode: true,
	defaultTheme: "light",
};

function wrap(overrides: Partial<ChromeData> = {}) {
	return ({ children }: { children: ReactNode }) => (
		<I18nProvider defaultLang="en" languages={{ en: async () => ({}) }}>
			<ChromeDataContext.Provider value={{ ...BASE, ...overrides }}>
				{children}
			</ChromeDataContext.Provider>
		</I18nProvider>
	);
}

beforeEach(() => {
	document.cookie = "tbtop_theme=; path=/; max-age=0";
	document.documentElement.classList.remove("dark");
});

afterEach(() => {
	document.cookie = "tbtop_theme=; path=/; max-age=0";
	document.documentElement.classList.remove("dark");
});

describe("ThemeToggle", () => {
	test("cycles light → dark → system on successive clicks", () => {
		const { getByTestId } = render(<ThemeToggle />, { wrapper: wrap() });
		const btn = getByTestId("theme-toggle");

		expect(btn.getAttribute("data-theme-mode")).toBe("light");
		fireEvent.click(btn);
		expect(btn.getAttribute("data-theme-mode")).toBe("dark");
		fireEvent.click(btn);
		expect(btn.getAttribute("data-theme-mode")).toBe("system");
		fireEvent.click(btn);
		expect(btn.getAttribute("data-theme-mode")).toBe("light");
	});

	test("applies the dark class when switched to dark", () => {
		const { getByTestId } = render(<ThemeToggle />, { wrapper: wrap() });
		fireEvent.click(getByTestId("theme-toggle"));
		expect(document.documentElement.classList.contains("dark")).toBe(true);
	});

	test("renders nothing when dark mode is disabled", () => {
		const { queryByTestId } = render(<ThemeToggle />, { wrapper: wrap({ darkMode: false }) });
		expect(queryByTestId("theme-toggle")).toBeNull();
	});
});
