/**
 * Tests for the unsaved-changes guard behaviour in FormControllerBody.
 *
 * Channels covered:
 *  1. beforeunload — browser tab close / page refresh
 *  2. router.on('before') — Inertia client-side navigation
 *
 * Test approach:
 *  - The guard is opt-in via `guardUnsaved` in form options (default true per global config).
 *  - We pass guardUnsaved explicitly so tests don't depend on global config.
 *  - router is mocked via module augmentation to capture registered listeners.
 */
import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import * as inertiaReact from "@inertiajs/react";
import { act, fireEvent, render, waitFor } from "@testing-library/react";
import { useEffect, useState } from "react";
import { executeEffects, readEffects } from "../inertia/effects";
import { materialize } from "../inertia/materialize";
import { markServerRedirect } from "../inertia/navigationIntent";
import { renderNode } from "../render/structureRenderer";
import { s } from "./structure";
import { wrapForStructure as wrap } from "./testFixtures";
import type { ClientActionContext, StructureNode } from "./types";

// ---------------------------------------------------------------------------
// Minimal router mock — captures listeners registered via router.on('before')
// and router.post's onSuccess callback (so the test controls exactly when it
// fires, to reproduce the real same-tick ordering against a flash update).
// Link stays REAL: a prop-dropping stub Link would leak across the whole run
// (mock.module is process-global) and break asChild testid forwarding (M-95).
// ---------------------------------------------------------------------------

type BeforeListener = (event: { detail: { visit: { method?: string } } }) => boolean | void;
type PostOptions = { onSuccess?: () => void; onError?: (errors: Record<string, string>) => void };

const registeredBeforeListeners: BeforeListener[] = [];
let routerOnCalled = false;
let capturedPostOnSuccess: (() => void) | undefined;
// Real router.visit() fires the registered 'before' listeners before
// navigating — that's the whole mechanism useUnsavedGuard relies on. A bare
// no-op mock would never invoke the guard at all, which made an earlier
// version of this test pass for the wrong reason (nothing ran, not "guard
// correctly skipped"). Route it through the same listener list router.on
// populates so a redirect visit exercises the guard exactly like the app.
const routerVisitMock = mock((href: string) => {
	fireInertiaNavigation("get");
	return href;
});

mock.module("@inertiajs/react", () => ({
	...inertiaReact,
	router: {
		visit: routerVisitMock,
		post: mock((_url: string, _data: unknown, options: PostOptions) => {
			capturedPostOnSuccess = options.onSuccess;
		}),
		on: mock((event: string, listener: BeforeListener) => {
			if (event === "before") {
				registeredBeforeListeners.push(listener);
				routerOnCalled = true;
			}
			// Return an off() function
			return () => {
				const idx = registeredBeforeListeners.indexOf(listener);
				if (idx !== -1) {
					registeredBeforeListeners.splice(idx, 1);
				}
			};
		}),
	},
}));

// Helper: fire a simulated Inertia 'before' event through the registered listeners.
// Returns false if any listener returned false (navigation blocked).
function fireInertiaNavigation(method = "get"): boolean {
	for (const listener of registeredBeforeListeners) {
		const result = listener({ detail: { visit: { method } } });
		if (result === false) {
			return false;
		}
	}
	return true;
}

beforeEach(() => {
	registeredBeforeListeners.length = 0;
	routerOnCalled = false;
	capturedPostOnSuccess = undefined;
	routerVisitMock.mockClear();
	// Reset window.confirm to return true by default
	(global as unknown as { confirm: (msg: string) => boolean }).confirm = () => true;
});

afterEach(() => {
	registeredBeforeListeners.length = 0;
});

describe("Form unsaved guard — beforeunload", () => {
	test("beforeunload event is prevented when form is dirty and guardUnsaved is true", async () => {
		const node = s.form({ query: async () => ({ title: "Hello" }), guardUnsaved: true }, [
			s.text({ name: "title" }),
			s.action({
				name: "edit",
				handler: async (c) => c.form?.set("title", "Changed"),
			}),
		]);
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);

		// Make the form dirty
		const editBtn = await findByTestId("action-edit");
		await act(async () => {
			fireEvent.click(editBtn);
		});

		// Simulate beforeunload
		const event = new Event("beforeunload") as BeforeUnloadEvent & {
			returnValue: string;
			preventDefault: () => void;
		};
		event.returnValue = "";
		fireEvent(window, event);

		// The event should have been prevented (returnValue set or defaultPrevented)
		expect(event.defaultPrevented || event.returnValue !== "").toBe(true);
	});

	test("beforeunload is NOT prevented when form is clean", async () => {
		const node = s.form({ query: async () => ({ title: "Hello" }), guardUnsaved: true }, [
			s.text({ name: "title" }),
		]);
		const Wrap = wrap(() => new Response("{}"));
		render(<Wrap>{renderNode(node)}</Wrap>);
		await waitFor(() => {}); // let query resolve

		const event = new Event("beforeunload") as BeforeUnloadEvent & {
			returnValue: string;
			preventDefault: () => void;
		};
		event.returnValue = "";
		fireEvent(window, event);

		// Should NOT be prevented — clean form
		expect(event.defaultPrevented).toBe(false);
	});

	test("beforeunload is NOT prevented when guardUnsaved is false even if dirty", async () => {
		const node = s.form({ query: async () => ({ title: "Hello" }), guardUnsaved: false }, [
			s.text({ name: "title" }),
			s.action({
				name: "edit",
				handler: async (c) => c.form?.set("title", "Changed"),
			}),
		]);
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);
		const editBtn = await findByTestId("action-edit");
		await act(async () => {
			fireEvent.click(editBtn);
		});

		const event = new Event("beforeunload") as BeforeUnloadEvent & {
			returnValue: string;
			preventDefault: () => void;
		};
		event.returnValue = "";
		fireEvent(window, event);

		expect(event.defaultPrevented).toBe(false);
	});
});

describe("Form unsaved guard — Inertia navigation", () => {
	test("Inertia navigation is blocked when form is dirty and user cancels", async () => {
		// User cancels (confirm returns false)
		(global as unknown as { confirm: (msg: string) => boolean }).confirm = () => false;

		const node = s.form({ query: async () => ({ title: "Hello" }), guardUnsaved: true }, [
			s.text({ name: "title" }),
			s.action({
				name: "edit",
				handler: async (c) => c.form?.set("title", "Changed"),
			}),
		]);
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);

		const editBtn = await findByTestId("action-edit");
		await act(async () => {
			fireEvent.click(editBtn);
		});

		const allowed = fireInertiaNavigation();
		expect(allowed).toBe(false);
	});

	test("Inertia navigation is allowed when form is dirty and user confirms", async () => {
		(global as unknown as { confirm: (msg: string) => boolean }).confirm = () => true;

		const node = s.form({ query: async () => ({ title: "Hello" }), guardUnsaved: true }, [
			s.text({ name: "title" }),
			s.action({
				name: "edit",
				handler: async (c) => c.form?.set("title", "Changed"),
			}),
		]);
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);

		const editBtn = await findByTestId("action-edit");
		await act(async () => {
			fireEvent.click(editBtn);
		});

		const allowed = fireInertiaNavigation();
		expect(allowed).toBe(true);
	});

	test("Inertia navigation is allowed when form is clean", async () => {
		(global as unknown as { confirm: (msg: string) => boolean }).confirm = () => false; // would block if dirty

		const node = s.form({ query: async () => ({ title: "Hello" }), guardUnsaved: true }, [
			s.text({ name: "title" }),
		]);
		const Wrap = wrap(() => new Response("{}"));
		render(<Wrap>{renderNode(node)}</Wrap>);
		await waitFor(() => {}); // let query resolve

		const allowed = fireInertiaNavigation();
		expect(allowed).toBe(true);
	});

	test("guard registers router.on('before') listener", async () => {
		const node = s.form({ query: async () => ({ title: "Hello" }), guardUnsaved: true }, [
			s.text({ name: "title" }),
		]);
		const Wrap = wrap(() => new Response("{}"));
		render(<Wrap>{renderNode(node)}</Wrap>);

		// The guard registers after the form's async query resolves; wait for the
		// real condition, not a bare tick (empty waitFor flakes under CI timing).
		await waitFor(() => expect(routerOnCalled).toBe(true));
	});

	test("guard does NOT block a POST visit (form submit) even when form is dirty", async () => {
		// If confirm is called and returns false it would block — proves guard was invoked.
		(global as unknown as { confirm: (msg: string) => boolean }).confirm = () => false;

		const node = s.form({ query: async () => ({ title: "Hello" }), guardUnsaved: true }, [
			s.text({ name: "title" }),
			s.action({
				name: "edit",
				handler: async (c) => c.form?.set("title", "Changed"),
			}),
		]);
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);

		// Make the form dirty
		const editBtn = await findByTestId("action-edit");
		await act(async () => {
			fireEvent.click(editBtn);
		});

		// A POST visit (form submit) must NOT be blocked by the guard.
		const allowed = fireInertiaNavigation("post");
		expect(allowed).toBe(true);
	});

	test("skips the confirm for a GET navigation marked as a server redirect, even when dirty and the user would cancel", async () => {
		(global as unknown as { confirm: (msg: string) => boolean }).confirm = mock(() => false);

		const node = s.form({ query: async () => ({ title: "Hello" }), guardUnsaved: true }, [
			s.text({ name: "title" }),
			s.action({
				name: "edit",
				handler: async (c) => c.form?.set("title", "Changed"),
			}),
		]);
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);

		const editBtn = await findByTestId("action-edit");
		await act(async () => {
			fireEvent.click(editBtn);
		});

		markServerRedirect();
		const allowed = fireInertiaNavigation("get");

		expect(allowed).toBe(true);
		expect(global.confirm).not.toHaveBeenCalled();
	});

	test("the server-redirect skip is one-shot: the NEXT navigation is guarded normally", async () => {
		(global as unknown as { confirm: (msg: string) => boolean }).confirm = mock(() => false);

		const node = s.form({ query: async () => ({ title: "Hello" }), guardUnsaved: true }, [
			s.text({ name: "title" }),
			s.action({
				name: "edit",
				handler: async (c) => c.form?.set("title", "Changed"),
			}),
		]);
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);

		const editBtn = await findByTestId("action-edit");
		await act(async () => {
			fireEvent.click(editBtn);
		});

		markServerRedirect();
		const firstAllowed = fireInertiaNavigation("get");
		expect(firstAllowed).toBe(true);
		expect(global.confirm).not.toHaveBeenCalled();

		// The flag was consumed by the first navigation — a second, unrelated
		// GET navigation must go through the normal isDirty/confirm path.
		const secondAllowed = fireInertiaNavigation("get");
		expect(secondAllowed).toBe(false);
		expect(global.confirm).toHaveBeenCalledTimes(1);
	});
});

// ---------------------------------------------------------------------------
// Real-order regression: server-initiated redirect after a successful save
// must not trip the unsaved guard.
//
// The reset-in-onSuccess fix (materializeActions.ts submitHandler) resets the
// form controller before resolving the submit promise, but that reset is a
// setState — it lands on the NEXT commit, not synchronously. AdminPage runs a
// separate `useEffect` keyed on `page.flash` that fires `router.visit` for a
// redirect effect. In the real app both the reset-triggering onSuccess and
// the flash-effect-driven redirect are reactions to the SAME props swap
// (Inertia's back() response), so the redirect can fire in the same
// React commit as the reset — before useUnsavedGuard's effect has
// re-registered with isDirty=false. FlashEffectProbe below mirrors AdminPage's
// real effect (using the real executeEffects/readEffects) so this test drives
// the actual same-tick race instead of a mock that can't reproduce it.
// ---------------------------------------------------------------------------

function FlashEffectProbe({ flash }: { flash: unknown }) {
	useEffect(() => {
		const effects = readEffects(flash);
		if (effects.length > 0) {
			executeEffects(effects, { notify: () => {} });
		}
	}, [flash]);
	return null;
}

function SaveFormWithFlashHarness() {
	const [flash, setFlash] = useState<unknown>(undefined);
	const node = materialize(
		{
			kind: "form",
			name: "post",
			options: {
				name: "post",
				query: async () => ({ title: "Hello" }),
				guardUnsaved: true,
				children: [
					{ kind: "text", name: "title", options: {}, meta: {} },
					{
						kind: "action",
						name: "edit",
						options: {
							handler: async (c: ClientActionContext) =>
								c.form?.set("title", "Changed"),
						},
						meta: {},
					},
					{
						kind: "action",
						name: "save",
						options: { spec: { type: "submit" } },
						meta: {},
					},
				],
			},
			meta: {},
		} as unknown as StructureNode,
		{ basePath: "/admin/posts", data: {} },
	);

	// Exposed on window so the test can drive the two halves of the "server
	// responded" step independently — mirroring the real app, where the
	// flash/props swap (Inertia's own page-state update) and router.post's
	// onSuccess callback (a separate promise completion that resets the form
	// controller's local React state) are NOT the same React commit. Batching
	// them into one act() call (an earlier version of this test) hid the bug:
	// it force-merged two independently-scheduled updates into a single
	// commit, which is not what happens in a real browser.
	(window as unknown as { __applyFlashRedirect?: () => void }).__applyFlashRedirect = () => {
		setFlash([{ kind: "redirect", href: "/admin/posts" }]);
	};
	(window as unknown as { __invokePostOnSuccess?: () => void }).__invokePostOnSuccess = () => {
		capturedPostOnSuccess?.();
	};

	return (
		<>
			{renderNode(node)}
			<FlashEffectProbe flash={flash} />
		</>
	);
}

describe("Form unsaved guard — server-initiated redirect after save (real ordering)", () => {
	test("window.confirm is NOT called when a flash redirect fires in the same tick as the post-save reset", async () => {
		(global as unknown as { confirm: (msg: string) => boolean }).confirm = mock(() => false);

		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId } = render(
			<Wrap>
				<SaveFormWithFlashHarness />
			</Wrap>,
		);

		// Make the form dirty via the edit action's handler (matches the
		// existing dirty-making convention in this file — ctx.form?.set).
		const editBtn = await findByTestId("action-edit");
		await act(async () => {
			fireEvent.click(editBtn);
		});

		// Submit — captures router.post's onSuccess without invoking it yet,
		// mirroring the real async gap between click and server response.
		const saveBtn = await findByTestId("action-save");
		await act(async () => {
			fireEvent.click(saveBtn);
		});
		await waitFor(() => expect(capturedPostOnSuccess).toBeDefined());

		// Simulate the real ordering: Inertia applies the props/flash swap
		// (AdminPage's flash effect fires the redirect) in ITS OWN commit,
		// separate from router.post's onSuccess callback (which resets the
		// form controller's local state in a LATER commit). These are two
		// independently-scheduled updates in the real app — collapsing them
		// into one act() (an earlier version of this test) hid the bug by
		// force-batching what is not actually batched together.
		await act(async () => {
			(window as unknown as { __applyFlashRedirect: () => void }).__applyFlashRedirect();
		});
		await act(async () => {
			(window as unknown as { __invokePostOnSuccess: () => void }).__invokePostOnSuccess();
		});

		expect(routerVisitMock).toHaveBeenCalledWith("/admin/posts");
		expect(global.confirm).not.toHaveBeenCalled();
	});
});
