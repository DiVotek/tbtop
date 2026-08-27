import { describe, expect, mock, spyOn, test } from "bun:test";
import * as inertiaReact from "@inertiajs/react";
import type { ModalStack } from "../structure/modalStack";
import { executeFlashEffects } from "./flashEffects";

// Mirrors effects.test.ts's router stub: executeFlashEffects' redirect
// handler calls router.visit directly, and mock.module is process-global.
const routerVisit = mock((_href: string, _options?: Record<string, unknown>) => {});
mock.module("@inertiajs/react", () => ({
	...inertiaReact,
	router: { visit: routerVisit, post: mock(() => {}), on: mock(() => () => {}) },
}));

const noModals: ModalStack = { push: () => () => {}, closeTop: () => false };

// A PHP author calling Effects::make()->haltModal()/resetForm()/setFormData()
// from a form-submit handler (Inertia flash) reaches a fresh page load with
// no enclosing form or modal body. Before the split, executeEffects's
// `ctx.form?.reset()` style handlers simply did nothing for these; that
// silence is what regressed if this test goes red without the warning firing.
describe("executeFlashEffects: unsupported kinds", () => {
	test("warns and does not throw for form/modal-body-only kinds", () => {
		const warn = spyOn(console, "warn").mockImplementation(() => {});
		const notify = mock(() => {});

		expect(() =>
			executeFlashEffects(
				[
					{ kind: "haltModal", message: "nope" },
					{ kind: "resetForm" },
					{ kind: "setFormData", data: { title: "x" } },
				],
				{ notify, modals: noModals },
			),
		).not.toThrow();

		expect(warn).toHaveBeenCalledTimes(3);
		expect(warn.mock.calls[0]?.[0]).toContain("haltModal");
		expect(notify).not.toHaveBeenCalled();
		warn.mockRestore();
	});
});

describe("executeFlashEffects: supported kinds", () => {
	test("still dispatches notify", () => {
		const notify = mock(() => {});
		executeFlashEffects([{ kind: "notify", message: "Saved" }], { notify, modals: noModals });
		expect(notify).toHaveBeenCalledWith({ kind: "success", message: "Saved" });
	});

	test("closeModal with no open modal is a silent no-op", () => {
		const warn = spyOn(console, "warn").mockImplementation(() => {});
		executeFlashEffects([{ kind: "closeModal" }], { notify: mock(() => {}), modals: noModals });
		expect(warn).not.toHaveBeenCalled();
		warn.mockRestore();
	});
});
