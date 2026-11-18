import { describe, expect, test } from "bun:test";
import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { collectConstraints } from "../inertia/collectConstraints";
import { settleSubmittedForm } from "../inertia/effects";
import { secretFieldNames, serializeFormData } from "../inertia/serializeFormData";
import { ensureBuiltinsRegistered } from "../render/registerBuiltins";
import { s } from "../structure/structure";
import { PasswordForm } from "./passwordField";
import type { SecretState, SecretValue } from "./secretPasswordForm";

ensureBuiltinsRegistered();

type PasswordOpts = Parameters<typeof s.password>[0];

function secretNode(name: string, secret: SecretState, extra: Record<string, unknown> = {}) {
	return s.password({ name, secret, ...extra } as PasswordOpts);
}

/** PasswordForm with its value held like the form controller holds it. */
function Harness({ secret, initial }: { secret: SecretState; initial?: SecretValue }) {
	const [value, setValue] = useState<SecretValue>(initial);
	return (
		<>
			<PasswordForm
				name="api_key"
				value={value as string | null}
				onChange={(next) => setValue(next as SecretValue)}
				options={{ secret }}
			/>
			<output data-testid="value">
				{value === undefined ? "undefined" : JSON.stringify(value)}
			</output>
		</>
	);
}

describe("secret() password", () => {
	test("a stored secret shows Set and its preview, with no input holding a value", () => {
		const { container, getByText } = render(
			<Harness secret={{ filled: true, preview: "…4242" }} />,
		);
		expect(getByText("Set")).toBeTruthy();
		expect(getByText("…4242")).toBeTruthy();
		expect(container.querySelector("input")).toBeNull();
		const row = container.querySelector("[role=group]");
		expect(row?.getAttribute("aria-labelledby")).toBe("api_key-label");
	});

	test("Replace opens an empty input; Cancel goes back to keeping the stored value", async () => {
		const user = userEvent.setup();
		const { container, getByRole, getByTestId } = render(<Harness secret={{ filled: true }} />);
		await user.click(getByRole("button", { name: "Replace" }));
		const input = container.querySelector("input[name=api_key]") as HTMLInputElement;
		expect(input.value).toBe("");
		await user.type(input, "sk_new");
		expect(getByTestId("value").textContent).toBe('"sk_new"');
		await user.type(input, "{Backspace>6}");
		expect(getByTestId("value").textContent).toBe('""');
		await user.click(getByRole("button", { name: "Cancel" }));
		expect(getByTestId("value").textContent).toBe("undefined");
		expect(getByRole("button", { name: "Replace" })).toBeTruthy();
	});

	test("Clear marks the value null until Undo; it is offered only when clearable", async () => {
		const user = userEvent.setup();
		const plain = render(<Harness secret={{ filled: true }} />);
		expect(plain.queryByRole("button", { name: "Clear" })).toBeNull();
		plain.unmount();

		const { getByRole, getByTestId, getByText } = render(
			<Harness secret={{ filled: true, clearable: true }} />,
		);
		await user.click(getByRole("button", { name: "Clear" }));
		expect(getByTestId("value").textContent).toBe("null");
		expect(getByText("Will be cleared on save")).toBeTruthy();
		await user.click(getByRole("button", { name: "Undo" }));
		expect(getByTestId("value").textContent).toBe("undefined");
	});

	test("a secret with nothing stored is a plain input saying Not set", () => {
		const { container } = render(<Harness secret={{ filled: false }} />);
		const input = container.querySelector("input[name=api_key]") as HTMLInputElement;
		expect(input.getAttribute("placeholder")).toBe("Not set");
		expect(input.getAttribute("autocomplete")).toBe("new-password");
	});
});

describe("secret() password on submit", () => {
	const form = s.form({}, [
		s.section({ title: "Keys" }, [
			secretNode("left", { filled: true }),
			secretNode("opened", { filled: true }),
			secretNode("cleared", { filled: true, clearable: true }),
			secretNode("replaced", { filled: true }),
		]),
		s.password({ name: "plain" }),
	]);

	test("a secret left alone, or opened and left empty, is not submitted", () => {
		const out = serializeFormData(
			{ left: undefined, opened: "", cleared: null, replaced: "sk_new", plain: null },
			form,
		);
		expect(out).toEqual({ cleared: null, replaced: "sk_new", plain: null });
		expect("left" in out).toBe(false);
	});

	test("only a secret's undefined drops the key; any other field keeps it", () => {
		const out = serializeFormData({ plain: undefined }, form);
		expect("plain" in out).toBe(true);
	});

	test("secretFieldNames finds secrets inside layout containers only", () => {
		expect(secretFieldNames(form).sort()).toEqual(["cleared", "left", "opened", "replaced"]);
	});

	test("a stored secret's required is not checked on the client", () => {
		const node = s.form({}, [
			secretNode("stored", { filled: true }, { constraints: { required: true, min: 8 } }),
			secretNode("empty", { filled: false }, { constraints: { required: true } }),
		]);
		const constraints = collectConstraints(node);
		expect(constraints.stored).toEqual({ min: 8 });
		expect(constraints.empty).toEqual({ required: true });
	});
});

describe("secret() password after a successful submit", () => {
	test("the typed secret is committed as left alone, other values as submitted", () => {
		let committed: Record<string, unknown> | undefined;
		const form = {
			data: { name: "Acme", api_key: "sk_new" },
			reset: (values?: Record<string, unknown>) => {
				committed = values;
			},
		} as unknown as Parameters<typeof settleSubmittedForm>[0];
		settleSubmittedForm(form, {}, ["api_key"]);
		expect(committed).toEqual({ name: "Acme" });
	});
});
