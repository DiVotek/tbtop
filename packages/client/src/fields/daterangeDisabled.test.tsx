import { describe, expect, mock, test } from "bun:test";
import { act, render, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FormControllerProvider } from "../structure/formContext";
import { useFormController } from "../structure/formController";
import { wrapForStructure as wrap } from "../structure/testFixtures";
import type { FormController } from "../structure/types";
import { type DisabledRange, rangeMatchers } from "./daterangeDisabled";
import { DaterangeForm, type DaterangeOptionsBag, type DaterangeValue } from "./daterangeField";

const Wrap = wrap(() => new Response("{}"));

function isDaterangeValue(raw: unknown): raw is DaterangeValue {
	return raw === null || (typeof raw === "object" && raw !== null && !Array.isArray(raw));
}

function renderDaterange(opts: DaterangeOptionsBag, initial: Record<string, unknown>) {
	const ctrls: FormController[] = [];
	function Harness() {
		const ctrl = useFormController({ initial });
		ctrls.push(ctrl);
		const raw = ctrl.data.stay;
		return (
			<FormControllerProvider value={ctrl}>
				<DaterangeForm
					name="stay"
					value={isDaterangeValue(raw) ? raw : null}
					onChange={(v) => ctrl.set("stay", v)}
					options={opts}
				/>
			</FormControllerProvider>
		);
	}
	const view = render(
		<Wrap>
			<Harness />
		</Wrap>,
	);
	return { ctrls, view, doc: view.container.ownerDocument };
}

function dayButton(doc: Document, iso: string): HTMLButtonElement {
	const date = new Date(
		Number(iso.slice(0, 4)),
		Number(iso.slice(5, 7)) - 1,
		Number(iso.slice(8)),
	);
	const found = doc.querySelector(`[data-day="${date.toLocaleDateString()}"]`);
	if (!found) {
		throw new Error(`no day button for ${iso}`);
	}
	return found as HTMLButtonElement;
}

describe("Daterange: deps-driven disabled ranges", () => {
	test("a deps change refetches ranges and the newly disabled days are not selectable", async () => {
		const queryRanges = mock(
			async (_ctx: unknown, deps: Record<string, string>): Promise<DisabledRange[]> =>
				deps.season === "winter" ? [{ from: "2026-03-10", to: "2026-03-20" }] : [],
		);
		const applied = { from: "2026-03-12", to: "2026-03-14" };
		const { ctrls, view, doc } = renderDaterange(
			{ dependsOn: ["season"], keepValue: true, disabledRanges: [], queryRanges },
			{ season: "summer", stay: applied },
		);
		// The serialized initial ranges are already correct — mount must not fetch.
		expect(queryRanges).not.toHaveBeenCalled();

		act(() => (ctrls.at(-1) as FormController).set("season", "winter"));
		await waitFor(() => expect(queryRanges).toHaveBeenCalled());
		expect(queryRanges.mock.calls[0]?.[1]).toEqual({ season: "winter" });

		const user = userEvent.setup();
		await user.click(view.getByTestId("daterange-trigger"));
		await waitFor(() => expect(doc.querySelector("[data-day]")).toBeTruthy());

		expect(dayButton(doc, "2026-03-15").disabled).toBe(true);
		expect(dayButton(doc, "2026-03-25").disabled).toBe(false);
		await user.click(dayButton(doc, "2026-03-15"));
		expect((ctrls.at(-1) as FormController).data.stay).toEqual(applied);
	});
});

describe("Daterange: open-ended range matchers", () => {
	// Wire ends are inclusive-disabled; day-picker's before/after are exclusive,
	// so each open end shifts by one day.
	test("an open start maps to a before matcher one day past its end", () => {
		expect(rangeMatchers([{ from: null, to: "2026-03-01" }])).toEqual([
			{ before: new Date(2026, 2, 2) },
		]);
	});

	test("an open end maps to an after matcher one day before its start", () => {
		expect(rangeMatchers([{ from: "2026-05-10", to: null }])).toEqual([
			{ after: new Date(2026, 4, 9) },
		]);
	});
});
