import { describe, expect, test } from "bun:test";
import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { ActiveLocaleProvider } from "../structure/contentLocaleContext";
import type { FieldFormProps } from "./fieldProps";
import { TranslatableWrapper } from "./translatableWrapper";

// Minimal text field for testing isolation without depending on registered fields.
function TextForm({ name, value, onChange }: FieldFormProps<unknown>): React.ReactNode {
	return (
		<input
			aria-label={name}
			value={(value as string) ?? ""}
			onChange={(e) => onChange(e.target.value)}
		/>
	);
}

type LocaleMap = Record<string, unknown>;

function Harness({
	initial,
	locales,
	active,
}: {
	initial: LocaleMap | null;
	locales: string[];
	active: string;
}) {
	const [value, setValue] = useState<LocaleMap | null>(initial);
	return (
		<ActiveLocaleProvider defaultLocale={active}>
			<TranslatableWrapper
				name="title"
				value={value}
				onChange={setValue}
				renderInner={(props) => <TextForm {...props} />}
				locales={locales}
			/>
		</ActiveLocaleProvider>
	);
}

describe("TranslatableWrapper", () => {
	test("renders all locale panels but only active one is visible", () => {
		const { container } = render(
			<Harness initial={{ en: "Hello", uk: "Привіт" }} locales={["en", "uk"]} active="en" />,
		);
		const panels = container.querySelectorAll("[data-locale]");
		expect(panels.length).toBe(2);
		const enPanel = container.querySelector("[data-locale='en']");
		const ukPanel = container.querySelector("[data-locale='uk']");
		expect((enPanel as HTMLElement).style.display).not.toBe("none");
		expect((ukPanel as HTMLElement).style.display).toBe("none");
	});

	test("inactive locale panel stays mounted (value preserved)", () => {
		const { getByLabelText } = render(
			<Harness initial={{ en: "Hello", uk: "Привіт" }} locales={["en", "uk"]} active="en" />,
		);
		// uk panel is hidden but the input is still in the DOM with its value.
		const ukInput = getByLabelText("title.uk");
		expect((ukInput as HTMLInputElement).value).toBe("Привіт");
	});

	test("editing active locale does not affect inactive locale value", async () => {
		const user = userEvent.setup();
		const { getByLabelText } = render(
			<Harness initial={{ en: "", uk: "Привіт" }} locales={["en", "uk"]} active="en" />,
		);
		const enInput = getByLabelText("title.en");
		await user.type(enInput, "Hello");
		expect((getByLabelText("title.uk") as HTMLInputElement).value).toBe("Привіт");
	});

	test("onChange emits locale map shape {locale: value}", async () => {
		const user = userEvent.setup();
		const captured: (LocaleMap | null)[] = [];
		function TrackedHarness() {
			const [value, setValue] = useState<LocaleMap | null>({ en: "", uk: "" });
			return (
				<ActiveLocaleProvider defaultLocale="en">
					<TranslatableWrapper
						name="title"
						value={value}
						onChange={(next) => {
							captured.push(next);
							setValue(next);
						}}
						renderInner={(props) => <TextForm {...props} />}
						locales={["en", "uk"]}
					/>
				</ActiveLocaleProvider>
			);
		}
		const { getByLabelText } = render(<TrackedHarness />);
		await user.type(getByLabelText("title.en"), "X");
		const last = captured[captured.length - 1];
		expect(last).not.toBeNull();
		expect(typeof last).toBe("object");
		expect((last as LocaleMap).en).toBe("X");
		expect("uk" in (last as LocaleMap)).toBe(true);
	});
});
