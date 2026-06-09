import { describe, expect, test } from "bun:test";
import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { TranslatableCell, TranslatableForm } from "./translatableField";

function Harness({ initial }: { initial: Record<string, string> }) {
	const [value, setValue] = useState(initial);
	return (
		<TranslatableForm
			name="title"
			value={value}
			onChange={(next) => setValue(next ?? {})}
			options={{ locales: ["uk", "en"] }}
		/>
	);
}

describe("Translatable field — tabs", () => {
	test("renders one tab per locale with the default locale's input visible", () => {
		const { getByRole } = render(
			<TranslatableForm
				name="title"
				value={{ uk: "Привіт", en: "Hello" }}
				onChange={() => {}}
				options={{ locales: ["uk", "en"], defaultLocale: "uk" }}
			/>,
		);
		// Default tab "uk" — its input is mounted and shows the value.
		expect((getByRole("textbox", { name: "uk" }) as HTMLInputElement).value).toBe("Привіт");
		// Tabs exist for both locales.
		expect(getByRole("tab", { name: /uk/ })).not.toBeNull();
		expect(getByRole("tab", { name: /en/ })).not.toBeNull();
	});

	test("switching tabs reveals the other locale's input with its value", async () => {
		const user = userEvent.setup();
		const { getByRole } = render(<Harness initial={{ en: "Hello", uk: "Привіт" }} />);

		// Initial tab is "uk" (first in locales).
		expect((getByRole("textbox", { name: "uk" }) as HTMLInputElement).value).toBe("Привіт");
		await user.click(getByRole("tab", { name: /en/ }));
		expect((getByRole("textbox", { name: "en" }) as HTMLInputElement).value).toBe("Hello");
	});

	test("editing a locale's input does not touch the others", async () => {
		const user = userEvent.setup();
		const { getByRole } = render(<Harness initial={{ en: "Hello" }} />);

		// Initial tab "uk" — its input is empty.
		await user.type(getByRole("textbox", { name: "uk" }), "Pryvit");
		expect((getByRole("textbox", { name: "uk" }) as HTMLInputElement).value).toBe("Pryvit");

		await user.click(getByRole("tab", { name: /en/ }));
		expect((getByRole("textbox", { name: "en" }) as HTMLInputElement).value).toBe("Hello");
	});

	test("a single-locale config falls back to a bare input — no tab strip", () => {
		const { getByRole, queryByRole } = render(
			<TranslatableForm
				name="title"
				value={{ en: "Hello" }}
				onChange={() => {}}
				options={{ locales: ["en"] }}
			/>,
		);
		expect((getByRole("textbox", { name: "en" }) as HTMLInputElement).value).toBe("Hello");
		expect(queryByRole("tab")).toBeNull();
	});

	test("cell shows the first non-empty locale in configured order", () => {
		const { getByText } = render(
			<TranslatableCell
				value={{ uk: "Привіт", en: "Hello" }}
				options={{ locales: ["en", "uk"] }}
			/>,
		);
		expect(getByText("Hello")).not.toBeNull();
	});
});
