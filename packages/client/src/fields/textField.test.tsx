import { expect, test } from "bun:test";
import { render, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { renderNode } from "../render/structureRenderer";
import { ContentLocaleConfigProvider } from "../structure/contentLocaleContext";
import { s } from "../structure/structure";
import { wrapForStructure as wrap } from "../structure/testFixtures";
import type { StructureNode } from "../structure/types";
import { TextForm } from "./textField";

/** s.* builders do not type `translatable`; the wire option is what the form reads. */
function translatableField(
	kind: string,
	name: string,
	options: Record<string, unknown>,
): StructureNode {
	return {
		kind,
		name,
		options: { name, translatable: true, ...options },
		meta: {},
	} as StructureNode;
}

function MaskHarness({ mask }: { mask: string }) {
	const [value, setValue] = useState<string | null>("");
	return <TextForm name="phone" value={value} onChange={setValue} options={{ mask }} />;
}

test("mask formats typed digits as the user types", async () => {
	const user = userEvent.setup();
	const { getByRole } = render(<MaskHarness mask="(999) 999-9999" />);
	const input = getByRole("textbox") as HTMLInputElement;
	await user.type(input, "1234567890");
	expect(input.value).toBe("(123) 456-7890");
});

test("mask displays a controlled raw value already formatted", () => {
	const { getByRole } = render(
		<TextForm
			name="phone"
			value="1234567890"
			onChange={() => {}}
			options={{ mask: "(999) 999-9999" }}
		/>,
	);
	expect((getByRole("textbox") as HTMLInputElement).value).toBe("(123) 456-7890");
});

test("copyable renders a copy button that writes the value to the clipboard", async () => {
	const user = userEvent.setup();
	let captured = "";
	Object.defineProperty(globalThis.navigator, "clipboard", {
		value: {
			writeText: async (text: string) => {
				captured = text;
			},
		},
		configurable: true,
	});
	const { getByRole } = render(
		<TextForm
			name="token"
			value="sk_live_123"
			onChange={() => {}}
			options={{ copyable: { message: "Token copied!", duration: 1000 } }}
		/>,
	);
	await user.click(getByRole("button", { name: "Copy" }));
	expect(captured).toBe("sk_live_123");
});

test("Text placeholder reaches the rendered input", async () => {
	const node = s.form({ query: async () => ({ name: null }) }, [
		s.text({ name: "name", placeholder: "Full name…" }),
	]);
	const Wrap = wrap(() => new Response("{}"));
	const { container, getByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);
	await waitFor(() => expect(getByTestId("form-block")).toBeTruthy());
	const input = container.querySelector("input[name=name]");
	expect(input?.getAttribute("placeholder")).toBe("Full name…");
});

test("Text affixes share one framed input group with the control", async () => {
	const prefix = { kind: "displayText", options: { content: "https://" }, meta: {} };
	const suffix = { kind: "displayText", options: { content: ".com" }, meta: {} };
	const node = s.form({ query: async () => ({ domain: "tabletop" }) }, [
		s.text({ name: "domain", prefix, suffix }),
	]);
	const Wrap = wrap(() => new Response("{}"));
	const { container, getByTestId, getByText } = render(<Wrap>{renderNode(node)}</Wrap>);
	await waitFor(() => expect(getByTestId("form-block")).toBeTruthy());
	const group = container.querySelector('[data-slot="input-group"]');

	expect(group?.querySelector('input[name="domain"]')).toBeTruthy();
	expect(getByText("https://")).toBeTruthy();
	expect(getByText(".com")).toBeTruthy();
});

test("Text placeholder reaches the masked input", () => {
	const { getByRole } = render(
		<TextForm
			name="phone"
			value=""
			onChange={() => {}}
			options={{ mask: "(999) 999-9999", placeholder: "(555) 555-5555" }}
		/>,
	);
	expect((getByRole("textbox") as HTMLInputElement).placeholder).toBe("(555) 555-5555");
});

test("a translatable text shows each locale's placeholder on its own tab", async () => {
	const node = s.form({ query: async () => ({ title: { en: "", uk: "" } }) }, [
		translatableField("text", "title", {
			placeholder: { en: "Page title", uk: "Назва сторінки" },
		}),
	]);
	const Wrap = wrap(() => new Response("{}"));
	const { container } = render(
		<ContentLocaleConfigProvider config={{ locales: ["en", "uk"], defaultLocale: "en" }}>
			<Wrap>{renderNode(node)}</Wrap>
		</ContentLocaleConfigProvider>,
	);
	await waitFor(() => {
		const en = container.querySelector('[data-locale="en"] input') as HTMLInputElement;
		const uk = container.querySelector('[data-locale="uk"] input') as HTMLInputElement;
		expect(en?.placeholder).toBe("Page title");
		expect(uk?.placeholder).toBe("Назва сторінки");
	});
});

test("a locale map on a non-translatable text reads the default content locale", () => {
	const { getByRole } = render(
		<ContentLocaleConfigProvider config={{ locales: ["en", "uk"], defaultLocale: "uk" }}>
			<TextForm
				name="title"
				value=""
				onChange={() => {}}
				options={{ placeholder: { en: "Page title", uk: "Назва сторінки" } }}
			/>
		</ContentLocaleConfigProvider>,
	);
	expect((getByRole("textbox") as HTMLInputElement).placeholder).toBe("Назва сторінки");
});
