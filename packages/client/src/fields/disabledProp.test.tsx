/**
 * Scenario 5: disabled prop threading to all form-surface field kinds.
 * Each test asserts that when disabled=true is passed, the interactive
 * native element carries the disabled attribute.
 */
import { describe, expect, test } from "bun:test";
import { render } from "@testing-library/react";
import { clientWrapper } from "../testFixtures";
import { BooleanForm } from "./booleanField";
import { CheckboxForm } from "./checkboxField";
import { ColorpickerForm } from "./colorpickerField";
import { DateForm, DateTimeForm, TimeForm } from "./dateField";
import { KeyvalueForm } from "./keyvalueField";
import { NumberForm } from "./numberField";
import { PasswordForm } from "./passwordField";
import { RadioForm } from "./radioField";
import { RepeaterForm } from "./repeaterField";
import { SelectForm } from "./selectField";
import { SlugForm } from "./slugField";
import { TagsForm } from "./tagsField";
import { TextareaForm } from "./textareaField";
import { TextForm } from "./textField";
import { UploadForm } from "./uploadField";

const ClientWrap = clientWrapper(() => new Response("{}"));

// Minimal noop onChange used by all form fixtures
const noop = () => {};

describe("disabled threading: input-like fields", () => {
	test("TextForm: input is disabled when disabled=true", () => {
		const { getByRole } = render(
			<TextForm name="title" value="hello" onChange={noop} disabled />,
		);
		expect((getByRole("textbox") as HTMLInputElement).disabled).toBe(true);
	});

	test("TextareaForm: textarea is disabled when disabled=true", () => {
		const { container } = render(
			<TextareaForm name="body" value="hello" onChange={noop} disabled />,
		);
		const ta = container.querySelector("textarea") as HTMLTextAreaElement;
		expect(ta.disabled).toBe(true);
	});

	test("NumberForm: input is disabled when disabled=true", () => {
		const { container } = render(<NumberForm name="qty" value={1} onChange={noop} disabled />);
		const input = container.querySelector("input") as HTMLInputElement;
		expect(input.disabled).toBe(true);
	});

	test("PasswordForm: input is disabled when disabled=true", () => {
		const { container } = render(
			<PasswordForm name="pass" value={null} onChange={noop} disabled />,
		);
		const input = container.querySelector("input") as HTMLInputElement;
		expect(input.disabled).toBe(true);
	});

	test("DateForm: input is disabled when disabled=true", () => {
		const { container } = render(
			<DateForm name="published_at" value={null} onChange={noop} disabled />,
		);
		const input = container.querySelector("input") as HTMLInputElement;
		expect(input.disabled).toBe(true);
	});

	test("DateTimeForm: input is disabled when disabled=true", () => {
		const { container } = render(
			<DateTimeForm name="starts_at" value={null} onChange={noop} disabled />,
		);
		const input = container.querySelector("input") as HTMLInputElement;
		expect(input.disabled).toBe(true);
	});

	test("TimeForm: input is disabled when disabled=true", () => {
		const { container } = render(
			<TimeForm name="time" value={null} onChange={noop} disabled />,
		);
		const input = container.querySelector("input") as HTMLInputElement;
		expect(input.disabled).toBe(true);
	});
});

describe("disabled threading: choice fields", () => {
	test("BooleanForm: switch is disabled when disabled=true", () => {
		const { container } = render(
			<BooleanForm name="active" value={false} onChange={noop} disabled />,
		);
		// Radix Switch renders a <button role="switch">
		const btn = container.querySelector("button") as HTMLButtonElement;
		expect(btn.disabled).toBe(true);
	});

	test("CheckboxForm: checkbox is disabled when disabled=true", () => {
		const { container } = render(
			<CheckboxForm name="agree" value={false} onChange={noop} disabled />,
		);
		const btn = container.querySelector("button") as HTMLButtonElement;
		expect(btn.disabled).toBe(true);
	});

	test("RadioForm: all radio items are disabled when disabled=true", () => {
		const { container } = render(
			<RadioForm
				name="kind"
				value={null}
				onChange={noop}
				disabled
				options={{
					options: [
						{ value: "a", label: "A" },
						{ value: "b", label: "B" },
					],
				}}
			/>,
		);
		const buttons = Array.from(container.querySelectorAll("button")) as HTMLButtonElement[];
		expect(buttons.length).toBeGreaterThan(0);
		expect(buttons.every((b) => b.disabled)).toBe(true);
	});

	test("SelectForm (static): trigger is disabled when disabled=true", () => {
		const { container } = render(
			<SelectForm
				name="status"
				value={null}
				onChange={noop}
				disabled
				options={{ options: [{ value: "a", label: "A" }] }}
			/>,
		);
		const btn = container.querySelector("button") as HTMLButtonElement;
		expect(btn.disabled).toBe(true);
	});

	test("ColorpickerForm: palette swatches are disabled when disabled=true", () => {
		const { container } = render(
			<ColorpickerForm
				name="color"
				value="#ff0000"
				onChange={noop}
				disabled
				options={{ palette: ["#ff0000", "#00ff00"] }}
			/>,
		);
		const swatches = Array.from(
			container.querySelectorAll("button[role='option']"),
		) as HTMLButtonElement[];
		expect(swatches.length).toBeGreaterThan(0);
		expect(swatches.every((b) => b.disabled)).toBe(true);
	});
});

describe("disabled threading: structured fields", () => {
	test("SlugForm: inputs and buttons are disabled when disabled=true", () => {
		const { container } = render(
			<SlugForm name="slug" value="my-slug" onChange={noop} disabled />,
		);
		const input = container.querySelector("input") as HTMLInputElement;
		expect(input.disabled).toBe(true);
		const buttons = Array.from(container.querySelectorAll("button")) as HTMLButtonElement[];
		expect(buttons.every((b) => b.disabled)).toBe(true);
	});

	test("UploadForm: file input is disabled when disabled=true", () => {
		const { container } = render(
			<ClientWrap>
				<UploadForm name="avatar" value={null} onChange={noop} disabled />
			</ClientWrap>,
		);
		const input = container.querySelector("input[type='file']") as HTMLInputElement;
		expect(input.disabled).toBe(true);
	});

	test("RepeaterForm: add-item button is disabled when disabled=true", () => {
		const { getByRole } = render(
			<RepeaterForm
				name="items"
				value={[{ title: "a" }]}
				onChange={noop}
				disabled
				options={{ fields: [] }}
			/>,
		);
		const addBtn = getByRole("button", { name: "Add item" }) as HTMLButtonElement;
		expect(addBtn.disabled).toBe(true);
	});

	test("TagsForm (open): input and chip-remove are disabled when disabled=true", () => {
		const { container } = render(
			<TagsForm name="tags" value={["a"]} onChange={noop} disabled />,
		);
		const input = container.querySelector("input") as HTMLInputElement;
		expect(input.disabled).toBe(true);
		const buttons = Array.from(container.querySelectorAll("button")) as HTMLButtonElement[];
		expect(buttons.length).toBeGreaterThan(0);
		expect(buttons.every((b) => b.disabled)).toBe(true);
	});

	test("TagsForm (closed): option buttons are disabled when disabled=true", () => {
		const { container } = render(
			<TagsForm
				name="tags"
				value={[]}
				onChange={noop}
				disabled
				options={{ options: [{ value: "a", label: "A" }] }}
			/>,
		);
		const buttons = Array.from(
			container.querySelectorAll("button[role='option']"),
		) as HTMLButtonElement[];
		expect(buttons.length).toBeGreaterThan(0);
		expect(buttons.every((b) => b.disabled)).toBe(true);
	});

	test("KeyvalueForm: inputs, remove and add-row buttons are disabled when disabled=true", () => {
		const { container } = render(
			<KeyvalueForm name="meta" value={{ a: "1" }} onChange={noop} disabled />,
		);
		const inputs = Array.from(container.querySelectorAll("input")) as HTMLInputElement[];
		expect(inputs.length).toBeGreaterThan(0);
		expect(inputs.every((i) => i.disabled)).toBe(true);
		const buttons = Array.from(container.querySelectorAll("button")) as HTMLButtonElement[];
		expect(buttons.length).toBeGreaterThan(0);
		expect(buttons.every((b) => b.disabled)).toBe(true);
	});
});
