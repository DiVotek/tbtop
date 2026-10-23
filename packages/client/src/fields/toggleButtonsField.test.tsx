import { describe, expect, test } from "bun:test";
import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToggleButtonsCell, ToggleButtonsForm } from "./toggleButtonsField";

const CHOICES = [
	{ value: "public", label: "Public" },
	{ value: "private", label: "Private" },
];

describe("ToggleButtons field — single", () => {
	test("selecting an option replaces the scalar value", async () => {
		const captured: (string | string[] | null)[] = [];
		const user = userEvent.setup();
		const { getByText } = render(
			<ToggleButtonsForm
				name="visibility"
				value="public"
				onChange={(next) => captured.push(next)}
				options={{ options: CHOICES }}
			/>,
		);
		await user.click(getByText("Private"));
		expect(captured.at(-1)).toBe("private");
	});

	test("cell renders the matching option label for a scalar value", () => {
		const { container } = render(
			<ToggleButtonsCell value="public" options={{ options: CHOICES }} />,
		);
		expect(container.textContent).toBe("Public");
	});
});

describe("ToggleButtons field — preset hooks", () => {
	test("the group and its items carry data-orientation for the preset's joined borders", () => {
		const { getByText } = render(
			<ToggleButtonsForm
				name="visibility"
				value="public"
				onChange={() => {}}
				options={{ options: CHOICES }}
			/>,
		);
		const item = getByText("Private").closest("[data-slot=toggle-group-item]");
		expect(item?.getAttribute("data-orientation")).toBe("horizontal");
		const group = item?.closest("[data-slot=toggle-group]");
		expect(group?.getAttribute("data-orientation")).toBe("horizontal");
	});
});

describe("ToggleButtons field — multiple", () => {
	test("selecting a second option accumulates into the array", async () => {
		const captured: (string | string[] | null)[] = [];
		const user = userEvent.setup();
		const { getByText } = render(
			<ToggleButtonsForm
				name="channels"
				value={["public"]}
				onChange={(next) => captured.push(next)}
				options={{ options: CHOICES, multiple: true }}
			/>,
		);
		await user.click(getByText("Private"));
		expect(captured.at(-1)).toEqual(["public", "private"]);
	});

	test("cell renders chips for an array value", () => {
		const { container } = render(
			<ToggleButtonsCell value={["public", "private"]} options={{ options: CHOICES }} />,
		);
		expect(container.textContent).toContain("Public");
		expect(container.textContent).toContain("Private");
	});

	test("cell renders nothing for an empty array", () => {
		const { container } = render(
			<ToggleButtonsCell value={[]} options={{ options: CHOICES }} />,
		);
		expect(container.textContent).toBe("");
	});
});

describe("ToggleButtons field — int-backed values", () => {
	const LEVELS = [
		{ value: "1", label: "Low" },
		{ value: "2", label: "High" },
	];

	test("a numeric record value presses its string-cast option", () => {
		const { getByText } = render(
			<ToggleButtonsForm
				name="level"
				value={2 as unknown as string}
				onChange={() => {}}
				options={{ options: LEVELS }}
			/>,
		);
		expect(getByText("High").closest("button")?.getAttribute("aria-checked")).toBe("true");
	});

	test("numeric values in multiple mode press their options", () => {
		const { getByText } = render(
			<ToggleButtonsForm
				name="levels"
				value={[1] as unknown as string[]}
				onChange={() => {}}
				options={{ options: LEVELS, multiple: true }}
			/>,
		);
		expect(getByText("Low").closest("button")?.getAttribute("aria-pressed")).toBe("true");
	});

	test("cell resolves the label for a numeric record value", () => {
		const { container } = render(
			<ToggleButtonsCell value={2 as unknown as string} options={{ options: LEVELS }} />,
		);
		expect(container.textContent).toBe("High");
	});
});
