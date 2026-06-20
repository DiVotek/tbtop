import { describe, expect, test } from "bun:test";
import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SliderCell, SliderForm } from "./sliderField";

describe("Slider field", () => {
	test("renders a slider thumb reflecting the controlled value", () => {
		const { getByRole } = render(
			<SliderForm
				name="score"
				value={4}
				onChange={() => {}}
				options={{ min: 0, max: 10, step: 1 }}
			/>,
		);
		expect(getByRole("slider").getAttribute("aria-valuenow")).toBe("4");
	});

	test("arrow-right on the focused thumb emits the next stepped value", async () => {
		const captured: (number | null)[] = [];
		const user = userEvent.setup();
		const { getByRole } = render(
			<SliderForm
				name="score"
				value={4}
				onChange={(next) => captured.push(next)}
				options={{ min: 0, max: 10, step: 1 }}
			/>,
		);
		const thumb = getByRole("slider");
		thumb.focus();
		await user.keyboard("{ArrowRight}");
		expect(captured.at(-1)).toBe(5);
	});

	test("arrow-left on the focused thumb emits the previous stepped value", async () => {
		const captured: (number | null)[] = [];
		const user = userEvent.setup();
		const { getByRole } = render(
			<SliderForm
				name="score"
				value={4}
				onChange={(next) => captured.push(next)}
				options={{ min: 0, max: 10, step: 1 }}
			/>,
		);
		const thumb = getByRole("slider");
		thumb.focus();
		await user.keyboard("{ArrowLeft}");
		expect(captured.at(-1)).toBe(3);
	});

	test("cell renders the numeric value", () => {
		const { container } = render(<SliderCell value={7} options={{}} />);
		expect(container.textContent).toBe("7");
	});

	test("cell renders nothing for a null value", () => {
		const { container } = render(<SliderCell value={null} options={{}} />);
		expect(container.textContent).toBe("");
	});
});
