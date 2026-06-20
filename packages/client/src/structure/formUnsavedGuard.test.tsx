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
import { renderNode } from "../render/structureRenderer";
import { s } from "./structure";
import { wrapForStructure as wrap } from "./testFixtures";

// ---------------------------------------------------------------------------
// Minimal router mock — captures listeners registered via router.on('before').
// Link stays REAL: a prop-dropping stub Link would leak across the whole run
// (mock.module is process-global) and break asChild testid forwarding (M-95).
// ---------------------------------------------------------------------------

type BeforeListener = (event: { detail: { visit: { method?: string } } }) => boolean | void;

const registeredBeforeListeners: BeforeListener[] = [];
let routerOnCalled = false;

mock.module("@inertiajs/react", () => ({
	...inertiaReact,
	router: {
		visit: mock(() => {}),
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
});
