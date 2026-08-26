import { describe, expect, test } from "bun:test";
import { render, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nProvider } from "../i18n/i18n";
import { DateForm } from "./dateForm";

function makeOnChange() {
	const calls: (string | null)[] = [];
	return { fn: (v: string | null) => calls.push(v), calls };
}

/** Opens the popover and waits for the lazy calendar chunk to resolve. */
async function openCalendar(value: string | null, onChange: (v: string | null) => void) {
	const user = userEvent.setup();
	const view = render(<DateForm name="published_at" value={value} onChange={onChange} />);
	await user.click(view.getByTestId("date-trigger"));
	const doc = view.container.ownerDocument;
	await waitFor(() => expect(doc.querySelector("[data-day]")).toBeTruthy());
	return { user, doc, view };
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

describe("Date: trigger label", () => {
	test("shows the placeholder when there is no value", () => {
		const { fn } = makeOnChange();
		const view = render(<DateForm name="published_at" value={null} onChange={fn} />);
		expect(view.getByTestId("date-trigger").textContent).toContain("Pick a date");
	});

	test("shows the formatted date once a value is set", () => {
		const { fn } = makeOnChange();
		const view = render(<DateForm name="published_at" value="2026-03-05" onChange={fn} />);
		expect(view.getByTestId("date-trigger").textContent).toContain("2026");
	});
});

describe("Date: picking a day", () => {
	test("clicking the trigger opens the calendar", async () => {
		const { fn } = makeOnChange();
		const { doc } = await openCalendar(null, fn);
		expect(doc.querySelectorAll("[data-day]").length).toBeGreaterThan(0);
	});

	test("clicking a day emits it and closes the popover", async () => {
		const { fn, calls } = makeOnChange();
		const { user, doc, view } = await openCalendar("2026-03-10", fn);

		await user.click(dayButton(doc, "2026-03-15"));

		expect(calls).toEqual(["2026-03-15"]);
		await waitFor(() => expect(doc.querySelector("[data-day]")).toBeNull());
		expect(view.queryByTestId("date-trigger")).toBeTruthy();
	});
});

describe("Date: clearing an applied value", () => {
	test("clear emits null so a form can return to empty", async () => {
		const { fn, calls } = makeOnChange();
		const { user, view } = await openCalendar("2026-03-10", fn);

		await user.click(view.getByTestId("date-clear"));

		expect(calls).toEqual([null]);
	});

	test("no clear control when there is no value to clear", async () => {
		const { fn } = makeOnChange();
		const { view } = await openCalendar(null, fn);

		expect(view.queryByTestId("date-clear")).toBeNull();
	});
});

describe("Date: disabled", () => {
	test("the trigger is disabled", () => {
		const { fn } = makeOnChange();
		const view = render(<DateForm name="published_at" value={null} onChange={fn} disabled />);
		expect((view.getByTestId("date-trigger") as HTMLButtonElement).disabled).toBe(true);
	});
});

describe("Date: follows the admin locale", () => {
	test("the trigger formats the value in the admin locale", async () => {
		const view = render(
			<I18nProvider locale="uk" languages={{ uk: async () => ({}) }}>
				<DateForm name="published_at" value="2026-03-10" onChange={() => {}} />
			</I18nProvider>,
		);
		await waitFor(() => expect(view.getByTestId("date-trigger").textContent).toContain("2026"));
	});

	test("month names render in the admin locale inside the calendar", async () => {
		const user = userEvent.setup();
		const view = render(
			<I18nProvider locale="uk" languages={{ uk: async () => ({}) }}>
				<DateForm name="published_at" value="2026-03-10" onChange={() => {}} />
			</I18nProvider>,
		);
		await user.click(view.getByTestId("date-trigger"));
		const doc = view.container.ownerDocument;
		await waitFor(() => expect(doc.body.textContent).toContain("березень"));
	});
});
