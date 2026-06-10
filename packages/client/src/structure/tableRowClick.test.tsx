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
