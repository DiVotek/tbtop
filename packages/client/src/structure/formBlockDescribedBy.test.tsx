/**
 * Every form control is tied to its helper text and validation error through
 * `aria-describedby`, so a screen reader announces both with the field.
 * Text-like fields are covered in formBlockFieldHelp.test.tsx; this sweeps the
 * composite controls that wire it by hand, asserting on the element that
 * carries the control's role, not on any node in the form.
 */
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { act, fireEvent, render, waitFor } from "@testing-library/react";
import { clearBlockRegistry } from "../render/blockRegistry";
import { ensureBuiltinsRegistered } from "../render/registerBuiltins";
import { renderNode } from "../render/structureRenderer";
import { s } from "./structure";
import { wrapForStructure as wrap } from "./testFixtures";
import type { StructureNode } from "./types";

const CHOICES = [
	{ value: "a", label: "Alpha" },
	{ value: "b", label: "Beta" },
];

/** [kind, case name, options, selector of the element that is the control]. */
const CASES: Array<[string, string, Record<string, unknown>, string]> = [
	["select", "static select", { options: CHOICES }, '[data-slot="select-trigger"]'],
	["select", "searchable select", { options: CHOICES, searchable: true }, "input#pick"],
	["select", "multiple select", { options: CHOICES, multiple: true }, "input#pick"],
	["tags", "open tags", {}, "input#pick"],
	["tags", "closed tags", { options: CHOICES }, '[role="listbox"]#pick'],
	["json", "json", {}, "textarea#pick"],
	["slider", "slider", {}, '[role="slider"]'],
	["daterange", "daterange", {}, "button#pick"],
	["colorpicker", "colorpicker", {}, '[role="group"][aria-labelledby="pick-label"]'],
	["repeater", "repeater", { fields: [] }, '[role="group"][aria-labelledby="pick-label"]'],
	["richtext", "richtext", {}, '[contenteditable][id="pick"]'],
];

function field(kind: string, options: Record<string, unknown>): StructureNode {
	return {
		kind,
		name: "pick",
		options: { name: "pick", label: "Pick", helperText: "Pick one.", ...options },
		meta: {},
	} as StructureNode;
}

beforeEach(() => {
	clearBlockRegistry();
	ensureBuiltinsRegistered();
});

afterEach(() => {
	clearBlockRegistry();
});

describe("helper text is the control's description", () => {
	for (const [kind, label, options, selector] of CASES) {
		test(label, async () => {
			const node = s.form({ query: async () => ({}) }, [field(kind, options)]);
			const Wrap = wrap(() => new Response("{}"));
			const { container } = render(<Wrap>{renderNode(node)}</Wrap>);
			await waitFor(() => {
				const control = container.querySelector(selector);
				expect(control).not.toBeNull();
				expect(control?.getAttribute("aria-describedby")?.split(" ")).toContain(
					"pick-helper",
				);
			});
		});
	}
});

describe("a validation error is announced with the control", () => {
	for (const [kind, label, options, selector] of CASES) {
		test(label, async () => {
			const node = s.form({ query: async () => ({ pick: null }) }, [
				field(kind, options),
				s.action({
					name: "save",
					handler: async () => {
						const err = new Error("validation") as Error & {
							fields: Record<string, string>;
						};
						err.fields = { pick: "Required." };
						throw err;
					},
				}),
			]);
			const Wrap = wrap(() => new Response("{}"));
			const { container, findByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);
			const save = await findByTestId("action-save");
			await act(async () => {
				fireEvent.click(save);
			});
			await findByTestId("field-error-pick");
			await waitFor(() => {
				const ids = container.querySelector(selector)?.getAttribute("aria-describedby");
				expect(ids?.split(" ")).toEqual(["pick-error", "pick-helper"]);
			});
		});
	}
});
