/**
 * A required field tells assistive tech so, on the element carrying the
 * control's role: the chrome's asterisk is visual only.
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

/** [kind, case name, options, selector of the element that is the control]. */
const CASES: Array<[string, string, Record<string, unknown>, string]> = [
	["text", "text", {}, "input#pick"],
	["textarea", "textarea", {}, "textarea#pick"],
	["password", "password", {}, "input#pick"],
	["number", "number", {}, "input#pick"],
	["time", "time", {}, "input#pick"],
	["json", "json", {}, "textarea#pick"],
	["checkbox", "checkbox", {}, '[role="checkbox"]'],
	["radio", "radio", { options: CHOICES }, '[role="radiogroup"]'],
	["select", "static select", { options: CHOICES }, '[data-slot="select-trigger"]'],
	["select", "searchable select", { options: CHOICES, searchable: true }, "input#pick"],
	["select", "multiple select", { options: CHOICES, multiple: true }, "input#pick"],
	["tags", "open tags", {}, "input#pick"],
	["tags", "closed tags", { options: CHOICES }, '[role="listbox"]#pick'],
];

function field(kind: string, options: Record<string, unknown>, required: boolean): StructureNode {
	return {
		kind,
		name: "pick",
		options: { name: "pick", label: "Pick", required, ...options },
		meta: {},
	} as StructureNode;
}

async function ariaRequired(
	kind: string,
	options: Record<string, unknown>,
	selector: string,
	required: boolean,
): Promise<string | null | undefined> {
	const node = s.form({ query: async () => ({}) }, [field(kind, options, required)]);
	const Wrap = wrap(() => new Response("{}"));
	const { container, unmount } = render(<Wrap>{renderNode(node)}</Wrap>);
	await waitFor(() => expect(container.querySelector(selector)).not.toBeNull());
	const value = container.querySelector(selector)?.getAttribute("aria-required");
	unmount();
	return value;
}

beforeEach(() => {
	clearBlockRegistry();
	ensureBuiltinsRegistered();
});

afterEach(() => {
	clearBlockRegistry();
});

describe("required reaches the control", () => {
	for (const [kind, label, options, selector] of CASES) {
		test(label, async () => {
			expect(await ariaRequired(kind, options, selector, true)).toBe("true");
			expect(await ariaRequired(kind, options, selector, false)).not.toBe("true");
		});
	}
});
