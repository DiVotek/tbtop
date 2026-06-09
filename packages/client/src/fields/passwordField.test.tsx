import { describe, expect, test } from "bun:test";
import { render, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderNode } from "../render/structureRenderer";
import { s } from "../structure/structure";
import { wrapForStructure as wrap } from "../structure/testFixtures";
import { PasswordCell, PasswordForm } from "./passwordField";

describe("Password field", () => {
	test("Password renders an input type=password with default autocomplete", async () => {
		const node = s.form({ query: async () => ({ password: "" }) }, [
			s.password({ name: "password" }),
		]);
		const Wrap = wrap(() => new Response("{}"));
		const { container, getByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);
		await waitFor(() => expect(getByTestId("form-block")).toBeTruthy());
		const input = container.querySelector("input[name=password]") as HTMLInputElement | null;
		expect(input).not.toBeNull();
		expect(input?.getAttribute("type")).toBe("password");
		expect(input?.getAttribute("autocomplete")).toBe("current-password");
	});

	test("Password explicit autoComplete reaches the rendered input", async () => {
		const node = s.form({ query: async () => ({ password: "" }) }, [
			s.password({ name: "password", autoComplete: "new-password" }),
		]);
		const Wrap = wrap(() => new Response("{}"));
		const { container, getByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);
		await waitFor(() => expect(getByTestId("form-block")).toBeTruthy());
		const input = container.querySelector("input[name=password]");
		expect(input?.getAttribute("autocomplete")).toBe("new-password");
	});

	test("Password toggle flips input type and aria-label", async () => {
		const user = userEvent.setup();
		const { container, getByRole } = render(
			<PasswordForm name="password" value="" onChange={() => {}} />,
		);
		const input = container.querySelector("input[name=password]") as HTMLInputElement;
		expect(input.getAttribute("type")).toBe("password");
		const toggle = getByRole("button", { name: "Show password" });
		await user.click(toggle);
		expect(input.getAttribute("type")).toBe("text");
		expect(getByRole("button", { name: "Hide password" })).toBeTruthy();
		await user.click(getByRole("button", { name: "Hide password" }));
		expect(input.getAttribute("type")).toBe("password");
	});

	test("Password clearing the input emits null through onChange", async () => {
		const captured: (string | null)[] = [];
		const user = userEvent.setup();
		const { container } = render(
			<PasswordForm
				name="password"
				value="X"
				onChange={(next) => {
					captured.push(next);
				}}
			/>,
		);
		const input = container.querySelector("input[name=password]") as HTMLInputElement;
		await user.type(input, "{Backspace}");
		expect(captured.at(-1)).toBeNull();
	});

	test("PasswordCell renders eight bullets for any non-empty value", () => {
		const { container, rerender } = render(<PasswordCell value="anything" />);
		expect(container.textContent).toBe("••••••••");
		rerender(<PasswordCell value={null} />);
		expect(container.textContent).toBe("");
		rerender(<PasswordCell value="" />);
		expect(container.textContent).toBe("");
	});

	test("Password placeholder reaches the rendered input", async () => {
		const node = s.form({ query: async () => ({ password: null }) }, [
			s.password({ name: "password", placeholder: "secret…" }),
		]);
		const Wrap = wrap(() => new Response("{}"));
		const { container, getByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);
		await waitFor(() => expect(getByTestId("form-block")).toBeTruthy());
		const input = container.querySelector("input[name=password]");
		expect(input?.getAttribute("placeholder")).toBe("secret…");
	});

	test("Password form-block wraps label and required marker, component renders only the input group", async () => {
		const node = s.form({ query: async () => ({ password: null }) }, [
			s.password({ name: "password", label: "Password", required: true }),
		]);
		const Wrap = wrap(() => new Response("{}"));
		const { container, getByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);
		await waitFor(() => expect(getByTestId("form-block")).toBeTruthy());
		const label = container.querySelector("label");
		expect(label?.textContent).toContain("Password");
		expect(label?.querySelector("span.text-destructive")?.textContent).toBe("*");
	});

	test("Password renders empty string when value is null", () => {
		const { container } = render(
			<PasswordForm name="password" value={null} onChange={() => {}} />,
		);
		const input = container.querySelector("input[name=password]") as HTMLInputElement | null;
		expect(input).not.toBeNull();
		expect(input?.value).toBe("");
	});
});
