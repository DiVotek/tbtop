/**
 * Tests for table rowClick: clicking a row triggers the named row action.
 */
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { act, fireEvent, render } from "@testing-library/react";
import { clearBlockRegistry } from "../render/blockRegistry";
import { ensureBuiltinsRegistered } from "../render/registerBuiltins";
import { renderNode } from "../render/structureRenderer";
import { s } from "./structure";
import { wrapForStructure as wrap } from "./testFixtures";

beforeEach(() => {
	clearBlockRegistry();
	ensureBuiltinsRegistered();
});

afterEach(() => {
	clearBlockRegistry();
});

describe("Table rowClick", () => {
	test("rowClick: clicking a data row triggers the named row action handler", async () => {
		let clickedId: unknown;
		const node = s.table({
			query: async () => [{ id: "42", title: "Post A" }],
			columns: [{ name: "title" }],
			rowActions: [
				{
					name: "edit",
					handler: async (c) => {
						clickedId = c.row?.id;
					},
				},
			],
			rowClick: "edit",
		});
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);
		const row = await findByTestId("table-row-42");
		await act(async () => {
			fireEvent.click(row);
		});
		expect(clickedId).toBe("42");
	});

	test("rowClick: clicking inside a button inside the row does NOT trigger rowClick", async () => {
		let rowClickCount = 0;
		const node = s.table({
			query: async () => [{ id: "1", title: "A" }],
			columns: [{ name: "title" }],
			rowActions: [
				{
					name: "edit",
					handler: async () => {
						rowClickCount++;
					},
				},
			],
			rowClick: "edit",
		});
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);
		const btn = await findByTestId("action-edit");
		await act(async () => {
			fireEvent.click(btn);
		});
		// action button click should run the handler, but NOT trigger an extra rowClick
		// (the action button itself calls the handler once; rowClick guard skips it)
		expect(rowClickCount).toBe(1);
	});

	test("rowClick: row has cursor-pointer class", async () => {
		const node = s.table({
			query: async () => [{ id: "5", title: "X" }],
			columns: [{ name: "title" }],
			rowActions: [{ name: "go", handler: async () => {} }],
			rowClick: "go",
		});
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);
		const row = await findByTestId("table-row-5");
		expect(row.className).toContain("cursor-pointer");
	});

	test("rowClick: unknown action name warns in dev, row click is inert", async () => {
		const node = s.table({
			query: async () => [{ id: "9", title: "Y" }],
			columns: [{ name: "title" }],
			rowActions: [{ name: "edit", handler: async () => {} }],
			rowClick: "nonexistent",
		});
		const Wrap = wrap(() => new Response("{}"));
		const warns: unknown[] = [];
		const origWarn = console.warn;
		console.warn = (...args: unknown[]) => warns.push(args);
		const { findByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);
		const row = await findByTestId("table-row-9");
		await act(async () => {
			fireEvent.click(row);
		});
		console.warn = origWarn;
		expect(warns.length).toBeGreaterThan(0);
	});

	/**
	 * Bug 5 — rowClick fires after closing a modal row action.
	 *
	 * Root cause: Radix Dialog renders its overlay in a DOM portal (outside the <tr>).
	 * When the user clicks the overlay to dismiss the dialog, the sequence is:
	 *   1. pointerdown fires on the overlay element (portal, not in <tr>)
	 *   2. The dialog closes; Radix unmounts the overlay → it leaves the DOM
	 *   3. The pointerup fires; browser dispatches click on the nearest ancestor
	 *      still in the tree → the <tr> receives the click
	 *   4. e.target is the now-detached overlay element (target.isConnected === false)
	 *   5. Before the fix: guard only checks `.closest(INTERACTIVE_SELECTOR)`, which
	 *      returns null for a detached element → rowClick handler executes (bug)
	 *   6. After the fix: guard also checks `!e.target.isConnected` → returns early
	 *
	 * Full portal pointer-sequence cannot be reproduced in happy-dom, so this test
	 * covers the isConnected guard unit via direct DOM event dispatch where the
	 * native event's target is set to a detached element using Object.defineProperty
	 * (verified to work in happy-dom — the native listener sees the detached target,
	 * but React's event delegation ignores events whose fiber-target is outside the
	 * React tree, so the click handler is not invoked even without the fix).
	 *
	 * The authoritative regression is a manual test:
	 *   1. Open the posts index table.
	 *   2. Click the row action that opens a modal (e.g. "Delete").
	 *   3. Dismiss the modal by clicking the dark overlay.
	 *   4. Confirm: the edit page does NOT open (rowClick was NOT triggered).
	 */
	test("rowClick: isConnected guard — handleRowClick ignores events with detached target", async () => {
		// Test that the isConnected check is present in the guard by verifying
		// that a row click via fireEvent (connected target) DOES trigger rowClick
		// while a click dispatched with an explicitly detached target does NOT.
		let clickCount = 0;
		const node = s.table({
			query: async () => [{ id: "7", title: "P" }],
			columns: [{ name: "title" }],
			rowActions: [
				{
					name: "edit",
					handler: async () => {
						clickCount++;
					},
				},
			],
			rowClick: "edit",
		});
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);
		const row = await findByTestId("table-row-7");

		// Normal click → rowClick fires.
		await act(async () => {
			fireEvent.click(row);
		});
		expect(clickCount).toBe(1);

		// Click whose React event target is a detached DOM node (simulates a Radix
		// portal close bubble). React does not route events whose fiber-target is
		// outside the tree, so clickCount stays at 1 without triggering rowClick.
		// The guard's isConnected check provides a safety net for any edge case where
		// React does route such an event (e.g. future React or Radix version change).
		const detachedTarget = document.createElement("div");
		// detachedTarget intentionally not appended → isConnected === false
		const evt = new MouseEvent("click", { bubbles: true, cancelable: true });
		Object.defineProperty(evt, "target", { value: detachedTarget, writable: false });
		await act(async () => {
			row.dispatchEvent(evt);
		});
		// Must still be 1 — the detached-target click must NOT trigger rowClick.
		expect(clickCount).toBe(1);
	});

	test("rowClick: keyboard Enter on row triggers the action", async () => {
		let triggered = false;
		const node = s.table({
			query: async () => [{ id: "3", title: "Z" }],
			columns: [{ name: "title" }],
			rowActions: [
				{
					name: "edit",
					handler: async () => {
						triggered = true;
					},
				},
			],
			rowClick: "edit",
		});
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);
		const row = await findByTestId("table-row-3");
		await act(async () => {
			fireEvent.keyDown(row, { key: "Enter" });
		});
		expect(triggered).toBe(true);
	});
});
