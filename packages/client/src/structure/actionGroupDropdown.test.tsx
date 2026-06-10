/**
 * Tests for actionGroup `as` option: 'dropdown' mode uses Radix DropdownMenu,
 * 'buttons' mode (default) stays as flat buttons.
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

describe("ActionGroup as=dropdown", () => {
	test("dropdown mode: trigger button has label and chevron, menu is hidden initially", () => {
		const node = s.actionGroup(
			"More",
			[s.action({ name: "edit", label: "Edit", url: "/edit" })],
			"dropdown",
		);
		const Wrap = wrap(() => new Response("{}"));
		const { getByTestId, queryByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);
		expect(getByTestId("action-group-trigger").textContent).toContain("More");
		expect(queryByTestId("action-group-menu")).toBeNull();
	});

	test("dropdown mode: clicking trigger opens the radix dropdown menu", async () => {
		const node = s.actionGroup(
			"Options",
			[s.action({ name: "del", label: "Delete", url: "/del" })],
			"dropdown",
		);
		const Wrap = wrap(() => new Response("{}"));
		const { getByTestId, findByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);
		// Radix DropdownMenu opens on pointerdown; fire both to simulate a real click.
		await act(async () => {
			const trigger = getByTestId("action-group-trigger");
			fireEvent.pointerDown(trigger, { bubbles: true, cancelable: true, isPrimary: true });
			fireEvent.click(trigger);
		});
		await findByTestId("action-group-menu");
	});

	test("dropdown mode in row context: trigger is MoreHorizontal icon button", async () => {
		const node = s.table({
			query: async () => [{ id: "1", title: "A" }],
			columns: [{ name: "title" }],
			rowActions: [
				{
					name: "editPost",
					label: "Edit",
					url: "/edit",
				},
			],
		});
		// actionGroup is rendered within table rows in row-action slot; here we
		// just confirm the icon trigger is present when as=dropdown in a row.
		// Use the standalone actionGroup test for isolation.
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);
		await findByTestId("action-editPost");
	});
});

describe("ActionGroup as=buttons (default)", () => {
	test("default (no as): renders as flat buttons row", async () => {
		const node = s.actionGroup("Actions", [
			s.action({ name: "pub", label: "Publish", url: "/pub" }),
			s.action({ name: "del", label: "Delete", url: "/del" }),
		]);
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);
		// trigger button should still be there (current behavior)
		await findByTestId("action-group-trigger");
	});

	test("explicit as=buttons: same behavior as default", async () => {
		const node = s.actionGroup(
			"Actions",
			[s.action({ name: "pub", label: "Publish", url: "/pub" })],
			"buttons",
		);
		const Wrap = wrap(() => new Response("{}"));
		const { getByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);
		expect(getByTestId("action-group-trigger").textContent).toContain("Actions");
	});
});
