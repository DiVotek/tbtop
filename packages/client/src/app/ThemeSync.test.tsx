import { afterEach, describe, expect, test } from "bun:test";
import { render } from "@testing-library/react";
import { type ChromeData, ChromeDataContext } from "./chromeContext";
import { ThemeSync } from "./ThemeSync";

const BASE: ChromeData = {
	nav: [],
	user: null,
	currentUrl: "/admin",
	brand: null,
	orientation: "vertical",
};

function renderSync(overrides: Partial<ChromeData> = {}) {
	return render(
		<ChromeDataContext.Provider value={{ ...BASE, ...overrides }}>
			<ThemeSync />
		</ChromeDataContext.Provider>,
	);
}

afterEach(() => {
	document.cookie = "tbtop_theme=; path=/; max-age=0";
	document.documentElement.classList.remove("dark");
});

describe("ThemeSync", () => {
	// Regression: the cookie was applied only inside ThemeToggle, so a
	// chrome without the toggle never got dark mode at all.
	test("applies the dark theme cookie at mount without a ThemeToggle present", () => {
		document.cookie = "tbtop_theme=dark; path=/";
		renderSync();
		expect(document.documentElement.classList.contains("dark")).toBeTrue();
	});

	test("light cookie removes the dark class", () => {
		document.documentElement.classList.add("dark");
		document.cookie = "tbtop_theme=light; path=/";
		renderSync();
		expect(document.documentElement.classList.contains("dark")).toBeFalse();
	});

	test("darkMode=false keeps the shell light even with a dark cookie", () => {
		document.cookie = "tbtop_theme=dark; path=/";
		renderSync({ darkMode: false });
		expect(document.documentElement.classList.contains("dark")).toBeFalse();
	});
});
