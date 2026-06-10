import { describe, expect, test } from "bun:test";
import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DaterangeForm } from "./daterangeField";

type DaterangeValue = { from?: string | null; to?: string | null } | null;

function makeOnChange() {
	const calls: DaterangeValue[] = [];
	const fn = (v: DaterangeValue) => calls.push(v);
	return { fn, calls };
}

describe("Daterange: form component", () => {
	test("Daterange: renders two date inputs for from and to", () => {
		const { fn } = makeOnChange();
		const { getByTestId } = render(
			<DaterangeForm name="published_at" value={null} onChange={fn} />,
		);
		expect((getByTestId("daterange-from") as HTMLInputElement).type).toBe("date");
		expect((getByTestId("daterange-to") as HTMLInputElement).type).toBe("date");
	});

	test("Daterange: from input change emits {from, to} with updated from", async () => {
		const { fn, calls } = makeOnChange();
		const user = userEvent.setup();
		const { getByTestId } = render(
			<DaterangeForm
				name="published_at"
				value={{ from: "", to: "2024-12-31" }}
				onChange={fn}
			/>,
		);
		await user.type(getByTestId("daterange-from"), "2024-03-01");
		const last = calls.at(-1);
		expect(last?.to).toBe("2024-12-31");
		expect(typeof last?.from).toBe("string");
		expect((last?.from ?? "").length).toBeGreaterThan(0);
	});

	test("Daterange: to input change emits {from, to} with updated to", async () => {
		const { fn, calls } = makeOnChange();
		const user = userEvent.setup();
		const { getByTestId } = render(
			<DaterangeForm
				name="published_at"
				value={{ from: "2024-01-01", to: "" }}
				onChange={fn}
			/>,
		);
		await user.type(getByTestId("daterange-to"), "2025-06-30");
		const last = calls.at(-1);
		expect(last?.from).toBe("2024-01-01");
		expect(typeof last?.to).toBe("string");
		expect((last?.to ?? "").length).toBeGreaterThan(0);
	});

	test("Daterange: null value renders empty inputs", () => {
		const { fn } = makeOnChange();
		const { getByTestId } = render(
			<DaterangeForm name="published_at" value={null} onChange={fn} />,
		);
		const fromInput = getByTestId("daterange-from") as HTMLInputElement;
		const toInput = getByTestId("daterange-to") as HTMLInputElement;
		expect(fromInput.value).toBe("");
		expect(toInput.value).toBe("");
	});

	test("Daterange: initial values populate the inputs", () => {
		const { fn } = makeOnChange();
		const { getByTestId } = render(
			<DaterangeForm
				name="published_at"
				value={{ from: "2024-01-01", to: "2024-12-31" }}
				onChange={fn}
			/>,
		);
		expect((getByTestId("daterange-from") as HTMLInputElement).value).toBe("2024-01-01");
		expect((getByTestId("daterange-to") as HTMLInputElement).value).toBe("2024-12-31");
	});
});
