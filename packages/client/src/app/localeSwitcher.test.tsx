import { describe, expect, test } from "bun:test";
import { act, fireEvent, render } from "@testing-library/react";
import { I18nProvider } from "../i18n/i18n";
import type { RenderProps } from "../render/blockRegistry";
import { LocaleSwitcherBlock } from "./chromeBlocks";

const LANGUAGES = {
	en: async () => ({}),
	uk: async () => ({}),
};

function renderSwitcher(options: { variant?: "buttons" | "dropdown" } = {}) {
	return render(
		<I18nProvider languages={LANGUAGES}>
			<LocaleSwitcherBlock
				options={options}
				{...({} as Omit<RenderProps<unknown>, "options">)}
			/>
		</I18nProvider>,
	);
}

describe("LocaleSwitcherBlock", () => {
	test("defaults to a button per available locale", () => {
		const { getByTestId } = renderSwitcher();
		expect(getByTestId("locale-switcher-en").tagName).toBe("BUTTON");
		expect(getByTestId("locale-switcher-uk").tagName).toBe("BUTTON");
	});

	test("dropdown variant hides the locale list until the trigger is opened", () => {
		const { getByTestId, queryByTestId } = renderSwitcher({ variant: "dropdown" });
		// Trigger is present; menu items are not rendered until opened.
		expect(getByTestId("locale-switcher")).toBeTruthy();
		expect(queryByTestId("locale-switcher-uk")).toBeNull();
	});

	test("opening the dropdown reveals the available locales", async () => {
		const { getByTestId, findByTestId } = renderSwitcher({ variant: "dropdown" });
		await act(async () => {
			fireEvent.pointerDown(getByTestId("locale-switcher"), {
				bubbles: true,
				cancelable: true,
				isPrimary: true,
			});
			fireEvent.click(getByTestId("locale-switcher"));
		});
		expect(await findByTestId("locale-switcher-uk")).toBeTruthy();
	});
});
