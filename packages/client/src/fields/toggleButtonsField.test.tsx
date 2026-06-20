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
