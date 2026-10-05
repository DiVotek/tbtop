import { describe, expect, test } from "bun:test";
import { render, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import type { DateOptionsBag } from "./dateForm";
import { DateForm } from "./dateForm";
import type { DaterangeOptionsBag } from "./daterangeField";
import { DaterangeForm } from "./daterangeField";
import type { DaterangeValue } from "./daterangeValue";

interface DateHarnessProps {
	initial: string | null;
	options?: DateOptionsBag;
	onChange: (value: string | null) => void;
}

// The field is controlled by the form in the real app, so the harness feeds
// the emitted value back — without that the input never sees its own edits.
function DateHarness({ initial, options, onChange }: DateHarnessProps) {
	const [value, setValue] = useState(initial);
	return (
		<DateForm
			name="published_at"
			value={value}
			options={options}
			onChange={(next: string | null) => {
				setValue(next);
				onChange(next);
			}}
		/>
	);
}

/** The default admin locale is "en", so typed dates read as mm/dd/yyyy. */
async function openDate(props: DateHarnessProps) {
	const user = userEvent.setup();
	const view = render(<DateHarness {...props} />);
	await user.click(view.getByTestId("date-trigger"));
	const input = await waitFor(() => view.getByTestId("date-input"));
	return { user, view, input: input as HTMLInputElement };
}

describe("Date: typed entry", () => {
	test("typing a full date emits it as an ISO day", async () => {
		const calls: (string | null)[] = [];
		const { user, input } = await openDate({
			initial: null,
			onChange: (v: string | null) => calls.push(v),
		});
		await user.type(input, "03/05/2026");
		expect(calls).toEqual(["2026-03-05"]);
	});

	test("a pasted ISO day is accepted alongside the locale format", async () => {
		const calls: (string | null)[] = [];
		const { user, input } = await openDate({
			initial: null,
			onChange: (v: string | null) => calls.push(v),
		});
		await user.type(input, "2026-03-05");
		expect(calls).toEqual(["2026-03-05"]);
	});

	test("half-typed text emits nothing and leaves the stored day alone", async () => {
		const calls: (string | null)[] = [];
		const { user, input } = await openDate({
			initial: "2026-03-05",
			onChange: (v: string | null) => calls.push(v),
		});
		await user.clear(input);
		await user.type(input, "03/0");
		expect(calls).toEqual([]);
	});

	test("an invalid date stays on screen and marks the field after blur", async () => {
		const { user, input } = await openDate({
			initial: null,
			onChange: () => {},
		});
		await user.type(input, "02/30/2026");
		await user.tab();
		expect(input.value).toBe("02/30/2026");
		expect(input.getAttribute("aria-invalid")).toBe("true");
	});

	test("the field is not marked invalid while the date is still being typed", async () => {
		const { user, input } = await openDate({
			initial: null,
			onChange: () => {},
		});
		await user.type(input, "03/0");
		expect(input.getAttribute("aria-invalid")).toBeNull();
	});

	test("a day outside minDate is refused and marked, not silently dropped", async () => {
		const calls: (string | null)[] = [];
		const { user, input } = await openDate({
			initial: null,
			onChange: (v: string | null) => calls.push(v),
			options: { minDate: "2026-03-01" },
		});
		await user.type(input, "02/10/2026");
		await user.tab();
		expect(calls).toEqual([]);
		expect(input.getAttribute("aria-invalid")).toBe("true");
	});

	test("the input shows the stored value in the locale format", async () => {
		const { input } = await openDate({
			initial: "2026-03-05",
			onChange: () => {},
		});
		expect(input.value).toBe("03/05/2026");
	});
});

interface RangeHarnessProps {
	initial: DaterangeValue;
	options?: DaterangeOptionsBag;
	onChange: (value: DaterangeValue) => void;
}

function RangeHarness({ initial, options, onChange }: RangeHarnessProps) {
	const [value, setValue] = useState(initial);
	return (
		<DaterangeForm
			name="period"
			value={value}
			options={options}
			onChange={(next: DaterangeValue) => {
				setValue(next);
				onChange(next);
			}}
		/>
	);
}

async function openRange(props: RangeHarnessProps) {
	const user = userEvent.setup();
	const view = render(<RangeHarness {...props} />);
	await user.click(view.getByTestId("daterange-trigger"));
	const from = await waitFor(() => view.getByTestId("daterange-input-from"));
	return {
		user,
		view,
		from: from as HTMLInputElement,
		to: view.getByTestId("daterange-input-to") as HTMLInputElement,
	};
}

describe("Daterange: typed entry", () => {
	test("emits nothing until both bounds are typed", async () => {
		const calls: DaterangeValue[] = [];
		const { user, from } = await openRange({
			initial: null,
			onChange: (v: DaterangeValue) => calls.push(v),
		});
		await user.type(from, "03/05/2026");
		expect(calls).toEqual([]);
	});

	test("typing both bounds emits the whole range", async () => {
		const calls: DaterangeValue[] = [];
		const { user, from, to } = await openRange({
			initial: null,
			onChange: (v: DaterangeValue) => calls.push(v),
		});
		await user.type(from, "03/05/2026");
		await user.type(to, "03/12/2026");
		expect(calls.at(-1)).toEqual({ from: "2026-03-05", to: "2026-03-12" });
	});

	test("editing one bound of an applied range keeps the other", async () => {
		const calls: DaterangeValue[] = [];
		const { user, to } = await openRange({
			initial: { from: "2026-03-05", to: "2026-03-12" },
			onChange: (v: DaterangeValue) => calls.push(v),
		});
		await user.clear(to);
		await user.type(to, "03/20/2026");
		expect(calls.at(-1)).toEqual({ from: "2026-03-05", to: "2026-03-20" });
	});

	test("does not emit a backwards range", async () => {
		const calls: DaterangeValue[] = [];
		const { user, from, to } = await openRange({
			initial: null,
			onChange: (v: DaterangeValue) => calls.push(v),
		});
		await user.type(to, "03/05/2026");
		await user.clear(from);
		await user.type(from, "03/20/2026");
		expect(calls).toEqual([]);
	});

	test("a bound inside a disabled range is refused and marked", async () => {
		const calls: DaterangeValue[] = [];
		const { user, from } = await openRange({
			initial: null,
			onChange: (v: DaterangeValue) => calls.push(v),
			options: { disabledRanges: [{ from: null, to: "2026-03-01" }] },
		});
		await user.type(from, "02/10/2026");
		await user.tab();
		expect(calls).toEqual([]);
		expect(from.getAttribute("aria-invalid")).toBe("true");
	});
});
