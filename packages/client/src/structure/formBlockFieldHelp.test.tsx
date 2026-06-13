/**
 * Tests for helperText and tooltip rendering on field chrome in the form block.
 * Both features are rendered by renderFieldNode() for any field kind.
 */
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { act, fireEvent, render } from "@testing-library/react";
import { clearBlockRegistry } from "../render/blockRegistry";
import { ensureBuiltinsRegistered } from "../render/registerBuiltins";
import { renderNode } from "../render/structureRenderer";
import { s } from "./structure";
import { wrapForStructure as wrap } from "./testFixtures";
import type { StructureNode } from "./types";

function fieldNode(
	kind: string,
	name: string,
	options: Record<string, unknown> = {},
): StructureNode {
	return { kind, name, options: { name, ...options }, meta: {} } as StructureNode;
}

function makeForm(fields: StructureNode[]) {
	return s.form({ query: async () => ({}) }, fields);
}

beforeEach(() => {
	clearBlockRegistry();
	ensureBuiltinsRegistered();
});

afterEach(() => {
	clearBlockRegistry();
});

describe("field helperText", () => {
	test("renders helper text below the input when helperText is set", async () => {
		const field = fieldNode("text", "bio", {
			label: "Bio",
			helperText: "A short description of yourself.",
		});
		const node = makeForm([field]);
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId, getByText } = render(<Wrap>{renderNode(node)}</Wrap>);

		await findByTestId("form-block");

		expect(getByText("A short description of yourself.")).toBeTruthy();
	});

	test("helper text element carries data-testid=field-helper-text", async () => {
		const field = fieldNode("text", "slug", { helperText: "Lowercase letters only." });
		const node = makeForm([field]);
		const Wrap = wrap(() => new Response("{}"));
		const { findAllByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);

		const helpers = await findAllByTestId("field-helper-text");

		expect(helpers.length).toBeGreaterThan(0);
		expect(helpers[0]?.textContent).toBe("Lowercase letters only.");
	});

	test("does not render a helper-text element when helperText is absent", async () => {
		const field = fieldNode("text", "title", { label: "Title" });
		const node = makeForm([field]);
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId, queryAllByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);

		await findByTestId("form-block");

		expect(queryAllByTestId("field-helper-text")).toHaveLength(0);
	});
});

describe("field tooltip", () => {
	test("renders info-icon trigger when tooltip is set", async () => {
		const field = fieldNode("text", "slug", {
			label: "Slug",
			tooltip: "Used in the URL — lowercase and hyphens only.",
		});
		const node = makeForm([field]);
		const Wrap = wrap(() => new Response("{}"));
		const { findByLabelText } = render(<Wrap>{renderNode(node)}</Wrap>);

		// The TooltipTrigger button carries aria-label equal to the tooltip text.
		const trigger = await findByLabelText("Used in the URL — lowercase and hyphens only.");

		expect(trigger).toBeTruthy();
	});

	test("does not render a tooltip trigger when tooltip is absent", async () => {
		const field = fieldNode("text", "title", { label: "Title" });
		const node = makeForm([field]);
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId, queryAllByRole } = render(<Wrap>{renderNode(node)}</Wrap>);

		await findByTestId("form-block");

		// No button with aria-label matching tooltip text means no tooltip trigger rendered.
		const buttons = queryAllByRole("button");
		expect(buttons).toHaveLength(0);
	});
});

describe("field helperText with validation error", () => {
	test("shows helper text AND error message simultaneously when a server error fires", async () => {
		const field = fieldNode("text", "title", {
			label: "Title",
			helperText: "Keep it short.",
		});
		const node = s.form({ query: async () => ({ title: "abc" }) }, [
			field,
			s.action({
				name: "save",
				handler: async () => {
					const err = new Error("validation") as Error & {
						fields: Record<string, string>;
					};
					err.fields = { title: "Too long." };
					throw err;
				},
			}),
		]);
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId, getByText } = render(<Wrap>{renderNode(node)}</Wrap>);

		const btn = await findByTestId("action-save");
		await act(async () => {
			fireEvent.click(btn);
		});

		// Both helper text and error must be visible at the same time.
		expect(getByText("Keep it short.")).toBeTruthy();
		const errorEl = await findByTestId("field-error-title");
		expect(errorEl.textContent).toBe("Too long.");
	});
});
