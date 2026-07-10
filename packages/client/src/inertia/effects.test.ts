import { describe, expect, mock, test } from "bun:test";
import * as inertiaReact from "@inertiajs/react";
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
const routerVisit = mock((_href: string) => {});
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
	test("marks the navigation as a server redirect before calling router.visit", () => {
		// Consume any leftover flag from a previous test so this assertion
		// only reflects what THIS redirect set.
		consumeServerRedirect();

		executeEffects([{ kind: "redirect", href: "/admin/posts" }], fakeCtx());

		expect(routerVisit).toHaveBeenCalledWith("/admin/posts");
		// One-shot: the flag must be set (readable exactly once) after the
		// redirect, so useUnsavedGuard's 'before' handler can skip its
		// isDirty check for this navigation.
		expect(consumeServerRedirect()).toBe(true);
	});

	test("does not mark a server redirect when the effect has no href", () => {
		consumeServerRedirect();
		routerVisit.mockClear();

		executeEffects([{ kind: "redirect" }], fakeCtx());

		expect(routerVisit).not.toHaveBeenCalled();
		expect(consumeServerRedirect()).toBe(false);
	});
});
