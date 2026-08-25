import { describe, expect, mock, spyOn, test } from "bun:test";
import * as inertiaReact from "@inertiajs/react";
import { executeFlashEffects } from "./flashEffects";

// Mirrors effects.test.ts's router stub: executeFlashEffects' redirect
// handler calls router.visit directly, and mock.module is process-global.
const routerVisit = mock((_href: string, _options?: Record<string, unknown>) => {});
mock.module("@inertiajs/react", () => ({
	...inertiaReact,
	router: { visit: routerVisit, post: mock(() => {}), on: mock(() => () => {}) },
}));

// A PHP author calling Effects::make()->haltModal()/closeModal()/resetForm()/
// setFormData() from a form-submit handler (Inertia flash) reaches a fresh
// page load with no enclosing form or modal — the real bug this split fixes.
// Before the split, executeEffects's `ctx.form?.reset()` style handlers
// simply did nothing for these; that silence is what regressed if this test
// goes red without the warning firing.
describe("executeFlashEffects: unsupported kinds", () => {
	test("warns and does not throw for form/modal-only kinds", () => {
		const warn = spyOn(console, "warn").mockImplementation(() => {});
		const notify = mock(() => {});

		expect(() =>
			executeFlashEffects(
				[
					{ kind: "haltModal", message: "nope" },
					{ kind: "closeModal" },
					{ kind: "resetForm" },
					{ kind: "setFormData", data: { title: "x" } },
				],
				{ notify },
			),
		).not.toThrow();

		expect(warn).toHaveBeenCalledTimes(4);
		expect(warn.mock.calls[0]?.[0]).toContain("haltModal");
		expect(notify).not.toHaveBeenCalled();
		warn.mockRestore();
	});
});

describe("executeFlashEffects: supported kinds", () => {
	test("still dispatches notify", () => {
		const notify = mock(() => {});
		executeFlashEffects([{ kind: "notify", message: "Saved" }], { notify });
		expect(notify).toHaveBeenCalledWith({ kind: "success", message: "Saved" });
	});
});
