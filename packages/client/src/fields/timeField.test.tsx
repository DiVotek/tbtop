import { describe, expect, test } from "bun:test";
import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TimeCell, TimeForm } from "./timeField";

describe("Time field", () => {
	test("renders shadcn selects instead of a native time input", () => {
		const { container, getByRole } = render(
			<TimeForm name="opens_at" value="09:30:45" onChange={() => {}} />,
		);

		expect(container.querySelector('input[type="time"]')).toBeNull();
		expect(getByRole("combobox", { name: "opens_at hour" }).textContent).toContain("09");
		expect(getByRole("combobox", { name: "opens_at minute" }).textContent).toContain("30");
	});

	test("associates the visible label and reports blur", async () => {
		let blurs = 0;
		const user = userEvent.setup();
		const { getByRole, getByText } = render(
			<>
				<label htmlFor="opens_at">Available from</label>
				<TimeForm
					name="opens_at"
					value="09:30"
					onChange={() => {}}
					onBlur={() => blurs++}
					options={{ label: "Available from" }}
				/>
			</>,
		);

		const hour = getByRole("combobox", { name: "Available from hour" });
		expect(getByRole("combobox", { name: "Available from minute" })).toBeTruthy();
		await user.click(getByText("Available from"));
		expect(hour.getAttribute("aria-expanded")).toBe("true");
		await user.keyboard("{Escape}");
		await user.tab();
		expect(blurs).toBeGreaterThan(0);
	});

	test("emits an HH:MM value from minute slots", async () => {
		const values: (string | null)[] = [];
		const user = userEvent.setup();
		const { getByRole } = render(
			<TimeForm
				name="opens_at"
				value="09:00"
				onChange={(next) => values.push(next)}
				options={{ step: 15 }}
			/>,
		);

		await user.click(getByRole("combobox", { name: "opens_at minute" }));
		await user.click(getByRole("option", { name: "45" }));
		expect(values).toEqual(["09:45"]);
	});

	test("keeps an existing off-step minute available", async () => {
		const user = userEvent.setup();
		const { getByRole } = render(
			<TimeForm name="opens_at" value="09:07" onChange={() => {}} options={{ step: 15 }} />,
		);

		await user.click(getByRole("combobox", { name: "opens_at minute" }));
		expect(getByRole("option", { name: "07" })).toBeTruthy();
	});

	test("clears the value", async () => {
		const values: (string | null)[] = [];
		const user = userEvent.setup();
		const { getByRole } = render(
			<TimeForm name="opens_at" value="09:30" onChange={(next) => values.push(next)} />,
		);

		await user.click(getByRole("button", { name: "Clear time" }));
		expect(values).toEqual([null]);
	});
});

test("TimeCell preserves HH:MM semantics", () => {
	const { container } = render(<TimeCell value="09:30:45" />);
	const time = container.querySelector("time");
	expect(time?.textContent).toBe("09:30");
	expect(time?.getAttribute("datetime")).toBe("09:30:45");
});
