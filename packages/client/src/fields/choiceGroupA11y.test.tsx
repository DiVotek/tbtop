import { describe, expect, test } from "bun:test";
import { render } from "@testing-library/react";
import { CheckboxListForm } from "./checkboxListField";
import { describedBy, FieldChrome } from "./fieldChrome";
import { RadioForm } from "./radioField";
import { ToggleButtonsForm } from "./toggleButtonsField";

const OPTIONS = [
	{ value: "a", label: "Alpha" },
	{ value: "b", label: "Beta" },
];

type GroupForm = typeof RadioForm | typeof CheckboxListForm | typeof ToggleButtonsForm;

function renderInChrome(Form: GroupForm, label: string | undefined) {
	const description = describedBy("status", "Pick one", "Shown on the card");
	// The three forms differ only in value type; the test drives them with one prop bag.
	const Control = Form as unknown as (
		props: Record<string, unknown>,
	) => ReturnType<typeof RadioForm>;
	return render(
		<FieldChrome
			fieldId="status"
			name="status"
			label={label}
			helperText="Shown on the card"
			error="Pick one"
		>
			<Control
				name="status"
				value={null}
				onChange={() => {}}
				describedBy={description}
				options={{ label, options: OPTIONS }}
			/>
		</FieldChrome>,
	);
}

const CASES: [string, GroupForm, "radiogroup" | "group"][] = [
	["radio", RadioForm, "radiogroup"],
	["checkboxlist", CheckboxListForm, "group"],
	["togglebuttons", ToggleButtonsForm, "radiogroup"],
];

describe("choice-group fields expose an accessible group", () => {
	for (const [kind, Form, role] of CASES) {
		test(`${kind}: the group is named by the field label`, () => {
			const { getByRole } = renderInChrome(Form, "Status");
			expect(getByRole(role, { name: /Status/ })).toBeTruthy();
		});

		test(`${kind}: the group is described by the error and helper text`, () => {
			const { getByRole } = renderInChrome(Form, "Status");
			const group = getByRole(role, { name: /Status/ });
			expect(group.getAttribute("aria-describedby")).toBe("status-error status-helper");
		});

		test(`${kind}: no dangling aria-labelledby without a label`, () => {
			const { getByRole } = renderInChrome(Form, undefined);
			expect(getByRole(role).hasAttribute("aria-labelledby")).toBe(false);
		});
	}
});
