/**
 * Every form control is tied to its helper text through `aria-describedby`,
 * so a screen reader announces the hint (and, when present, the validation
 * error) together with the field. Text-like fields are covered elsewhere;
 * this sweeps the composite controls that wire it by hand.
 */
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { render, waitFor } from "@testing-library/react";
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

const CASES: Array<[string, string, Record<string, unknown>]> = [
	["select", "static select", { options: CHOICES }],
	["select", "searchable select", { options: CHOICES, searchable: true }],
	["select", "multiple select", { options: CHOICES, multiple: true }],
	["tags", "open tags", {}],
	["tags", "closed tags", { options: CHOICES }],
	["json", "json", {}],
	["slider", "slider", {}],
	["daterange", "daterange", {}],
	["colorpicker", "colorpicker", {}],
	["repeater", "repeater", { fields: [] }],
	["richtext", "richtext", {}],
];

function renderField(kind: string, options: Record<string, unknown>) {
	const field = {
		kind,
		name: "pick",
		options: { name: "pick", label: "Pick", helperText: "Pick one.", ...options },
		meta: {},
	} as StructureNode;
	const Wrap = wrap(() => new Response("{}"));
	return render(<Wrap>{renderNode(s.form({ query: async () => ({}) }, [field]))}</Wrap>);
}

beforeEach(() => {
	clearBlockRegistry();
	ensureBuiltinsRegistered();
});

afterEach(() => {
	clearBlockRegistry();
});

describe("helper text is the control's description", () => {
	for (const [kind, label, options] of CASES) {
		test(label, async () => {
			const { container } = renderField(kind, options);
			await waitFor(() => {
				const described = container.querySelector('[aria-describedby~="pick-helper"]');
				expect(described).not.toBeNull();
			});
		});
	}
});
