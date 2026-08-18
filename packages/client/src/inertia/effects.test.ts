import { afterEach, describe, expect, mock, test } from "bun:test";
import * as inertiaReact from "@inertiajs/react";
import { act, renderHook } from "@testing-library/react";
import { useFormController } from "../structure/formController";
import type { ClientActionContext, ModalController } from "../structure/types";
import { executeEffects } from "./effects";
import { consumeServerRedirect } from "./navigationIntent";

// executeEffects' redirect handler calls router.visit directly. bun's
// mock.module is process-global — it replaces the WHOLE module for the rest
// of the process, including files that load after this one. The real
// router export is a class instance (methods live on the prototype, so
// `...inertiaReact.router` spreads none of them) — the stub must explicitly
// list every method another test file's mounted component might call.
// router.on in particular: any useUnsavedGuard-bearing form mounted later in
// the suite calls it on mount and would throw on undefined(). Spread the
// real module and override only router (mirroring materialize.test.ts /
// formUnsavedGuard.test.tsx) to avoid leaking a stub for Link/usePage/etc.
const routerVisit = mock((_href: string, _options?: Record<string, unknown>) => {});
mock.module("@inertiajs/react", () => ({
	...inertiaReact,
	router: { visit: routerVisit, post: mock(() => {}), on: mock(() => () => {}) },
}));

type EffectCtx = Pick<ClientActionContext, "notify" | "table" | "form" | "modal">;

function fakeCtx(overrides: Partial<EffectCtx> = {}): EffectCtx {
	return {
		notify: () => {},
		...overrides,
	};
}

describe("executeEffects: haltModal", () => {
	test("calls modal.halt with the message and level, does not call modal.close", () => {
		const halt = mock(() => {});
		const close = mock(() => {});
		const modal: ModalController = { close, closeAll: () => {}, halt };
		executeEffects(
			[{ kind: "haltModal", message: "Cannot delete: has children", level: "error" }],
			fakeCtx({ modal }),
		);
		expect(halt).toHaveBeenCalledWith("Cannot delete: has children", "error");
		expect(close).not.toHaveBeenCalled();
	});

	test("is a no-op (does not throw) when the modal controller has no halt method", () => {
		const close = mock(() => {});
		const modal: ModalController = { close, closeAll: () => {} };
		expect(() =>
			executeEffects([{ kind: "haltModal", message: "oops" }], fakeCtx({ modal })),
		).not.toThrow();
	});

	test("is a no-op when there is no surrounding modal at all", () => {
		expect(() =>
			executeEffects([{ kind: "haltModal", message: "oops" }], fakeCtx()),
		).not.toThrow();
	});
});

describe("executeEffects: closeModal contrast", () => {
	test("closeModal calls modal.close, unlike haltModal", () => {
		const halt = mock(() => {});
		const close = mock(() => {});
		const modal: ModalController = { close, closeAll: () => {}, halt };
		executeEffects([{ kind: "closeModal" }], fakeCtx({ modal }));
		expect(close).toHaveBeenCalledTimes(1);
		expect(halt).not.toHaveBeenCalled();
	});
});

describe("executeEffects: redirect", () => {
	test("preserves state and scroll only for a redirect to the current pathname", () => {
		// Consume any leftover flag from a previous test so this assertion
		// only reflects what THIS redirect set.
		consumeServerRedirect();

		executeEffects([{ kind: "redirect", href: `${location.pathname}?saved=1` }], fakeCtx());

		expect(routerVisit).toHaveBeenCalledWith(`${location.pathname}?saved=1`, {
			preserveState: true,
			preserveScroll: true,
		});
		// One-shot: the flag must be set (readable exactly once) after the
		// redirect, so useUnsavedGuard's 'before' handler can skip its
		// isDirty check for this navigation.
		expect(consumeServerRedirect()).toBe(true);
		routerVisit.mockClear();

		executeEffects([{ kind: "redirect", href: "/admin/posts" }], fakeCtx());

		expect(routerVisit).toHaveBeenCalledWith("/admin/posts", {
			preserveState: false,
			preserveScroll: false,
		});
	});

	test("does not mark a server redirect when the effect has no href", () => {
		consumeServerRedirect();
		routerVisit.mockClear();

		executeEffects([{ kind: "redirect" }], fakeCtx());

		expect(routerVisit).not.toHaveBeenCalled();
		expect(consumeServerRedirect()).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// copyToClipboard — cms's preview-link modal needs a "Copy" button; this is
// the reusable client half (PHP: Effects::copyToClipboard, tested separately
// in ActionPolishTest.php).
// ---------------------------------------------------------------------------

describe("executeEffects: copyToClipboard", () => {
	const originalClipboard = Object.getOwnPropertyDescriptor(globalThis.navigator, "clipboard");

	afterEach(() => {
		if (originalClipboard) {
			Object.defineProperty(globalThis.navigator, "clipboard", originalClipboard);
		}
	});

	function stubClipboard(writeText: (text: string) => Promise<void>): void {
		Object.defineProperty(globalThis.navigator, "clipboard", {
			value: { writeText },
			configurable: true,
		});
	}

	test("writes effect.text via navigator.clipboard.writeText and notifies success", async () => {
		const writeText = mock((_text: string) => Promise.resolve());
		stubClipboard(writeText);
		const notify = mock(() => {});

		executeEffects([{ kind: "copyToClipboard", text: "https://example.com/preview?sig=abc" }], {
			...fakeCtx({ notify }),
			t: (key: string) => (key === "field.copyable.copied" ? "Copied" : key),
		});
		// the handler awaits the clipboard write internally; flush microtasks
		await Promise.resolve();
		await Promise.resolve();

		expect(writeText).toHaveBeenCalledWith("https://example.com/preview?sig=abc");
		expect(notify).toHaveBeenCalledWith({ kind: "success", message: "Copied" });
	});

	test("falls back to the default message when no translate function is supplied", async () => {
		const writeText = mock((_text: string) => Promise.resolve());
		stubClipboard(writeText);
		const notify = mock(() => {});

		executeEffects([{ kind: "copyToClipboard", text: "abc" }], fakeCtx({ notify }));
		await Promise.resolve();
		await Promise.resolve();

		expect(notify).toHaveBeenCalledWith({ kind: "success", message: "Copied" });
	});

	test("does not notify when the effect has no text", async () => {
		const writeText = mock((_text: string) => Promise.resolve());
		stubClipboard(writeText);
		const notify = mock(() => {});

		executeEffects([{ kind: "copyToClipboard" }], fakeCtx({ notify }));
		await Promise.resolve();
		await Promise.resolve();

		expect(writeText).not.toHaveBeenCalled();
		expect(notify).not.toHaveBeenCalled();
	});
});

// ---------------------------------------------------------------------------
// setFormData — a server action rewrites the still-mounted form's values
// (e.g. a repeater gains a row). Driven through the real useFormController so
// "the form becomes dirty" is an observed outcome, not a mock assertion.
// ---------------------------------------------------------------------------

describe("executeEffects: setFormData", () => {
	function mountForm(initial: Record<string, unknown>) {
		return renderHook(() => useFormController({ initial })).result;
	}

	test("writes every key into the form and leaves it dirty", () => {
		const initial = { title: "Old", blocks: [{ title: "a" }] };
		const form = mountForm(initial);
		const blocks = [{ title: "rewritten" }, { title: "b" }, { title: "c" }];

		act(() => {
			executeEffects(
				[{ kind: "setFormData", data: { title: "New", blocks } }],
				fakeCtx({ form: form.current }),
			);
		});

		expect(form.current.data).toEqual({ title: "New", blocks });
		expect(form.current.isDirty).toBe(true);
		// initial is the untouched baseline: mutating it would silently make
		// the rewritten form look saved.
		expect(form.current.initial).toEqual(initial);
	});

	test("clears errors on the written key and under it, leaving other fields' errors", () => {
		const form = mountForm({ blocks: [], slug: "" });
		act(() => {
			form.current.setFieldError("blocks", "Required");
			form.current.setFieldError("blocks.0.title", "Too short");
			form.current.setFieldError("slug", "Taken");
		});

		act(() => {
			executeEffects(
				[{ kind: "setFormData", data: { blocks: [{ title: "ok" }] } }],
				fakeCtx({ form: form.current }),
			);
		});

		expect(form.current.fieldErrors).toEqual({ slug: "Taken" });
	});

	test("is a no-op (does not throw) when there is no enclosing form", () => {
		expect(() =>
			executeEffects([{ kind: "setFormData", data: { title: "x" } }], fakeCtx()),
		).not.toThrow();
	});
});
