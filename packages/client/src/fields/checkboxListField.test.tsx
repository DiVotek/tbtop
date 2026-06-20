import { describe, expect, test } from "bun:test";
import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CheckboxListCell, CheckboxListForm } from "./checkboxListField";

const CHOICES = [
	{ value: "news", label: "News" },
	{ value: "guide", label: "Guide" },
];

describe("CheckboxList field", () => {
	test("clicking an unselected option adds its value to the array", async () => {
		const captured: (string[] | null)[] = [];
		const user = userEvent.setup();
		const { container } = render(
			<CheckboxListForm
				name="tags"
				value={["news"]}
				onChange={(next) => captured.push(next)}
				options={{ options: CHOICES }}
			/>,
		);
		const boxes = container.querySelectorAll('[data-slot="checkbox"]');
		await user.click(boxes[1] as HTMLElement);
		expect(captured.at(-1)).toEqual(["news", "guide"]);
	});

	test("clicking a selected option removes its value from the array", async () => {
		const captured: (string[] | null)[] = [];
		const user = userEvent.setup();
		const { container } = render(
			<CheckboxListForm
				name="tags"
				value={["news", "guide"]}
				onChange={(next) => captured.push(next)}
				options={{ options: CHOICES }}
			/>,
		);
		const boxes = container.querySelectorAll('[data-slot="checkbox"]');
		await user.click(boxes[0] as HTMLElement);
		expect(captured.at(-1)).toEqual(["guide"]);
	});

	test("clearing the last selected option emits null so required can trigger", async () => {
		const captured: (string[] | null)[] = [];
		const user = userEvent.setup();
		const { container } = render(
			<CheckboxListForm
				name="tags"
				value={["news"]}
				onChange={(next) => captured.push(next)}
				options={{ options: CHOICES }}
			/>,
		);
		const boxes = container.querySelectorAll('[data-slot="checkbox"]');
		await user.click(boxes[0] as HTMLElement);
		expect(captured.at(-1)).toBeNull();
	});

	test("cell renders option labels for the selected values", () => {
		const { container } = render(
			<CheckboxListCell value={["news", "guide"]} options={{ options: CHOICES }} />,
		);
		expect(container.textContent).toContain("News");
		expect(container.textContent).toContain("Guide");
	});

	test("cell renders nothing for an empty selection", () => {
		const { container } = render(
			<CheckboxListCell value={[]} options={{ options: CHOICES }} />,
		);
		expect(container.textContent).toBe("");
	});
});
