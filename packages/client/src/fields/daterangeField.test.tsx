import { describe, expect, test } from "bun:test";
import { render, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DaterangeForm, type DaterangeValue, parseDay, toDateRange } from "./daterangeField";

function makeOnChange() {
	const calls: DaterangeValue[] = [];
	return { fn: (v: DaterangeValue) => calls.push(v), calls };
}

/** Opens the popover and waits for the lazy calendar chunk to resolve. */
async function openCalendar(value: DaterangeValue, onChange: (v: DaterangeValue) => void) {
	const user = userEvent.setup();
	const view = render(<DaterangeForm name="published_at" value={value} onChange={onChange} />);
	await user.click(view.getByTestId("daterange-trigger"));
	const doc = view.container.ownerDocument;
	await waitFor(() => expect(doc.querySelector("[data-day]")).toBeTruthy());
	return { user, doc };
}

function isoDay(date: Date): string {
	const pad = (n: number) => String(n).padStart(2, "0");
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function dayButton(doc: Document, iso: string): HTMLElement {
	const date = new Date(
		Number(iso.slice(0, 4)),
		Number(iso.slice(5, 7)) - 1,
		Number(iso.slice(8)),
	);
	const label = date.toLocaleDateString();
	const found = doc.querySelector(`[data-day="${label}"]`);
	if (!found) {
		throw new Error(`no day button for ${iso} (${label})`);
	}
	return found as HTMLElement;
}

describe("Daterange: emits only a complete range", () => {
	test("picking one bound emits nothing", async () => {
		const { fn, calls } = makeOnChange();
		const { user, doc } = await openCalendar({ from: "2026-03-10", to: "2026-03-20" }, fn);

		await user.click(dayButton(doc, "2026-03-05"));

		expect(calls).toHaveLength(0);
	});

	// Clicking the same day twice is a valid one-day range, not an abandoned
	// pick — both bounds are known, so it applies like any other range.
	test("the same day twice emits a single-day range", async () => {
		const { fn, calls } = makeOnChange();
		const { user, doc } = await openCalendar({ from: "2026-03-10", to: "2026-03-20" }, fn);

		await user.click(dayButton(doc, "2026-03-05"));
		await user.click(dayButton(doc, "2026-03-05"));

		expect(calls).toEqual([{ from: "2026-03-05", to: "2026-03-05" }]);
	});

	test("picking both bounds emits the full range once", async () => {
		const { fn, calls } = makeOnChange();
		const { user, doc } = await openCalendar({ from: "2026-03-10", to: "2026-03-20" }, fn);

		await user.click(dayButton(doc, "2026-03-05"));
		await user.click(dayButton(doc, "2026-03-08"));

		expect(calls).toHaveLength(1);
		expect(calls[0]).toEqual({ from: "2026-03-05", to: "2026-03-08" });
	});

	// day-picker merges the click into the applied range, so on these two sides
	// the clicked day comes back as `to` and the stale `from` is the old start.
	test("a first click after the applied end starts there, not at the old start", async () => {
		const { fn, calls } = makeOnChange();
		const { user, doc } = await openCalendar({ from: "2026-03-10", to: "2026-03-20" }, fn);

		await user.click(dayButton(doc, "2026-03-25"));
		await user.click(dayButton(doc, "2026-03-28"));

		expect(calls).toEqual([{ from: "2026-03-25", to: "2026-03-28" }]);
	});

	test("a first click inside the applied range starts there", async () => {
		const { fn, calls } = makeOnChange();
		const { user, doc } = await openCalendar({ from: "2026-03-10", to: "2026-03-20" }, fn);

		await user.click(dayButton(doc, "2026-03-15"));
		await user.click(dayButton(doc, "2026-03-18"));

		expect(calls).toEqual([{ from: "2026-03-15", to: "2026-03-18" }]);
	});
});

describe("Daterange: null/undefined conversion", () => {
	test("an empty range still emits string bounds, never undefined", async () => {
		const { fn, calls } = makeOnChange();
		// Two days in the month the calendar opens on when there is no value.
		const today = new Date();
		const first = isoDay(new Date(today.getFullYear(), today.getMonth(), 5));
		const second = isoDay(new Date(today.getFullYear(), today.getMonth(), 8));
		const { user, doc } = await openCalendar({ from: null, to: null }, fn);

		await user.click(dayButton(doc, first));
		await user.click(dayButton(doc, second));

		expect(calls[0]).toEqual({ from: first, to: second });
	});

	test("null bounds read back as an absent range, not an invalid one", () => {
		expect(toDateRange(null)).toBeUndefined();
		expect(toDateRange({ from: null, to: null })).toBeUndefined();
	});

	test("a single populated bound survives the round trip", () => {
		const range = toDateRange({ from: "2026-03-05", to: null });
		expect(range?.from).toBeInstanceOf(Date);
		expect(range?.to).toBeUndefined();
	});
});

describe("Daterange: parseDay rejects unusable input", () => {
	test.each([
		"",
		"not-a-date",
		"2026-13-01",
		"2026-02-30",
		"2026-1-5",
	])("parseDay(%p) is undefined", (input) => {
		expect(parseDay(input)).toBeUndefined();
	});

	test("null and undefined are absent, not invalid", () => {
		expect(parseDay(null)).toBeUndefined();
		expect(parseDay(undefined)).toBeUndefined();
	});

	test("a valid ISO day parses to that local calendar day", () => {
		const parsed = parseDay("2026-03-05");
		expect(parsed?.getFullYear()).toBe(2026);
		expect(parsed?.getMonth()).toBe(2);
		expect(parsed?.getDate()).toBe(5);
	});
});
