import { describe, expect, test } from "bun:test";
import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { TimeCell, TimeForm } from "./timeField";

interface TimeHarnessProps {
	initial?: string | null;
	options?: { seconds?: boolean; minuteStep?: number; secondStep?: number };
	onValue?: (value: string | null) => void;
}

function TimeHarness({ initial = null, options, onValue }: TimeHarnessProps) {
	const [value, setValue] = useState(initial);
	return (
		<TimeForm
			name="opens_at"
			value={value}
			onChange={(next) => {
				setValue(next);
				onValue?.(next);
			}}
			options={options}
		/>
	);
}

describe("Time field", () => {
	test("renders one shadcn-styled minute-precision input by default", () => {
		const { container } = render(
			<TimeForm name="opens_at" value="09:30:45" onChange={() => {}} />,
		);
		const input = container.querySelector('input[type="time"]') as HTMLInputElement;

		expect(input.value).toBe("09:30");
		expect(input.step).toBe("60");
		expect(input.className).toContain("[&::-webkit-calendar-picker-indicator]:hidden");
	});

	test("enables seconds with one-second precision by default", () => {
		const { container } = render(
			<TimeForm
				name="opens_at"
				value="09:30:45"
				onChange={() => {}}
				options={{ seconds: true }}
			/>,
		);
		const input = container.querySelector('input[type="time"]') as HTMLInputElement;

		expect(input.value).toBe("09:30:45");
		expect(input.step).toBe("1");
	});

	test("updates and clears when the controlled value changes", () => {
		const view = render(<TimeForm name="opens_at" value="09:30" onChange={() => {}} />);
		const input = view.container.querySelector('input[type="time"]') as HTMLInputElement;

		view.rerender(<TimeForm name="opens_at" value="17:45" onChange={() => {}} />);
		expect(input.value).toBe("17:45");
		view.rerender(<TimeForm name="opens_at" value={null} onChange={() => {}} />);
		expect(input.value).toBe("");
	});

	test("maps minute and second steps to HTML seconds", () => {
		const minute = render(
			<TimeForm
				name="opens_at"
				value="09:30"
				onChange={() => {}}
				options={{ minuteStep: 15 }}
			/>,
		).container.querySelector('input[type="time"]') as HTMLInputElement;
		const second = render(
			<TimeForm
				name="closes_at"
				value="17:30:10"
				onChange={() => {}}
				options={{ seconds: true, secondStep: 5 }}
			/>,
		).container.querySelector('input[type="time"]') as HTMLInputElement;

		expect(minute.step).toBe("900");
		expect(second.step).toBe("5");
	});

	test("associates the visible label and reports blur", async () => {
		let blurs = 0;
		const user = userEvent.setup();
		const { getByLabelText, getByText } = render(
			<>
				<label htmlFor="opens_at">Available from</label>
				<TimeForm
					name="opens_at"
					value="09:30"
					onChange={() => {}}
					onBlur={() => blurs++}
				/>
			</>,
		);

		await user.click(getByText("Available from"));
		expect(document.activeElement).toBe(getByLabelText("Available from"));
		await user.tab();
		expect(blurs).toBe(1);
	});

	test("emits HH:MM from user input", async () => {
		const values: (string | null)[] = [];
		const user = userEvent.setup();
		const { container } = render(<TimeHarness onValue={(next) => values.push(next)} />);
		const input = container.querySelector('input[type="time"]') as HTMLInputElement;

		await user.type(input, "09:45");
		expect(values.at(-1)).toBe("09:45");
	});

	test("emits HH:MM:SS in seconds mode", async () => {
		const values: (string | null)[] = [];
		const user = userEvent.setup();
		const { container } = render(
			<TimeHarness options={{ seconds: true }} onValue={(next) => values.push(next)} />,
		);
		const input = container.querySelector('input[type="time"]') as HTMLInputElement;

		await user.type(input, "09:45");
		expect(values.at(-1)).toBe("09:45:00");
	});

	test("preserves full timestamp values supported by the previous renderer", () => {
		const timestamp = "2024-03-15T09:30:45Z";
		const date = new Date(timestamp);
		const expected = `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
		const { container } = render(
			<TimeForm name="opens_at" value={timestamp} onChange={() => {}} />,
		);

		expect((container.querySelector('input[type="time"]') as HTMLInputElement).value).toBe(
			expected,
		);
	});
});

test("TimeCell follows configured precision", () => {
	const minute = render(<TimeCell value="09:30:45" />).container.querySelector("time");
	const second = render(
		<TimeCell value="09:30:45" options={{ seconds: true }} />,
	).container.querySelector("time");

	expect(minute?.textContent).toBe("09:30");
	expect(second?.textContent).toBe("09:30:45");
});
