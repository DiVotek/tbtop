import { describe, expect, test } from "bun:test";
import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { ensureBuiltinsRegistered } from "../render/registerBuiltins";
import { RepeaterForm } from "./repeaterField";

ensureBuiltinsRegistered();

type Item = Record<string, unknown>;
type SubField = { kind: string; name: string; options: Record<string, unknown>; meta: object };

interface HarnessProps {
	initial: Item[] | null;
	options: {
		fields: SubField[];
		collapsible?: boolean;
		summary?: string;
	};
	onEmit?: (v: Item[] | null) => void;
}

function Harness({ initial, options, onEmit }: HarnessProps) {
	const [value, setValue] = useState<Item[] | null>(initial);
	return (
		<RepeaterForm
			name="items"
			value={value}
			onChange={(next) => {
				setValue(next);
				onEmit?.(next);
			}}
			options={options as unknown as HarnessProps["options"]}
		/>
	);
}

const labelField: SubField = { kind: "text", name: "label", options: {}, meta: {} };

function repeaterSubField(name: string, fields: SubField[]): SubField {
	return { kind: "repeater", name, options: { fields }, meta: {} };
}

describe("collapsible repeater", () => {
	test("collapses each row to a summary title from the summary field", () => {
		const { getByText, queryByRole } = render(
			<Harness
				initial={[{ label: "Home" }, { label: "About" }]}
				options={{ fields: [labelField], collapsible: true, summary: "label" }}
			/>,
		);
		expect(getByText("Home")).toBeTruthy();
		expect(getByText("About")).toBeTruthy();
		// collapsed → no sub-field inputs rendered yet
		expect(queryByRole("textbox")).toBeNull();
	});

	test("falls back to 'Untitled' when the summary field is empty", () => {
		const { getByText } = render(
			<Harness
				initial={[{ label: "" }]}
				options={{ fields: [labelField], collapsible: true, summary: "label" }}
			/>,
		);
		expect(getByText("Untitled")).toBeTruthy();
	});

	test("clicking the summary reveals the edit form", async () => {
		const user = userEvent.setup();
		const { getByText, queryByRole, getByRole } = render(
			<Harness
				initial={[{ label: "Home" }]}
				options={{ fields: [labelField], collapsible: true, summary: "label" }}
			/>,
		);
		expect(queryByRole("textbox")).toBeNull();
		await user.click(getByText("Home"));
		expect(getByRole("textbox")).toBeTruthy();
	});

	test("editing a revealed sub-field emits the new value", async () => {
		const user = userEvent.setup();
		const emits: (Item[] | null)[] = [];
		const { getByText, getByRole } = render(
			<Harness
				initial={[{ label: "Home" }]}
				options={{ fields: [labelField], collapsible: true, summary: "label" }}
				onEmit={(v) => emits.push(v)}
			/>,
		);
		await user.click(getByText("Home"));
		const input = getByRole("textbox") as HTMLInputElement;
		await user.clear(input);
		await user.type(input, "Start");
		expect(emits.at(-1)).toEqual([{ label: "Start" }]);
	});
});

describe("nested repeater (depth 2)", () => {
	test("edits a child sub-value and emits the nested tree at the right path", async () => {
		const user = userEvent.setup();
		const emits: (Item[] | null)[] = [];
		const { getAllByRole } = render(
			<Harness
				initial={[
					{
						label: "About",
						children: [{ label: "Team" }],
					},
				]}
				options={{ fields: [labelField, repeaterSubField("children", [labelField])] }}
				onEmit={(v) => emits.push(v)}
			/>,
		);
		// Expanded (non-collapsible) parent renders both the parent's label input
		// and the child repeater's label input. The child input is the second textbox.
		const inputs = getAllByRole("textbox") as HTMLInputElement[];
		expect(inputs.length).toBe(2);
		await user.clear(inputs[1] as HTMLElement);
		await user.type(inputs[1] as HTMLElement, "Crew");
		expect(emits.at(-1)).toEqual([{ label: "About", children: [{ label: "Crew" }] }]);
	});
});
