import { expect, test } from "bun:test";
import { render, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { renderNode } from "../render/structureRenderer";
import { s } from "../structure/structure";
import { wrapForStructure as wrap } from "../structure/testFixtures";
import { TextForm } from "./textField";

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
