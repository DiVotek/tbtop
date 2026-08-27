/**
 * Repeater sub-fields carry the same chrome as top-level fields: helperText,
 * tooltip, and the aria wiring (aria-describedby → helper/error ids,
 * aria-invalid when the row has a server error).
 */
import { describe, expect, test } from "bun:test";
import { act, fireEvent, render, waitFor } from "@testing-library/react";
import { ensureBuiltinsRegistered } from "../render/registerBuiltins";
import { renderNode } from "../render/structureRenderer";
import { s } from "../structure/structure";
import { wrapForStructure as wrap } from "../structure/testFixtures";
import type { StructureNode } from "../structure/types";

ensureBuiltinsRegistered();

// helperText/tooltip are not on the typed builder opts (PHP emits them); raw nodes match the wire.
function textNode(name: string, options: Record<string, unknown>): StructureNode {
	return { kind: "text", name, options: { name, ...options }, meta: {} } as StructureNode;
}

function throwFieldErrors(fields: Record<string, string>): () => Promise<void> {
	return async () => {
		const err = new Error("validation") as Error & { fields: Record<string, string> };
		err.fields = fields;
		throw err;
	};
}

function subFieldInput(container: HTMLElement): HTMLInputElement {
	const el = container.querySelector('[data-field-name="items.0.value"] input');
	if (!(el instanceof HTMLInputElement)) {
		throw new Error("sub-field input missing");
	}
	return el;
}

describe("repeater sub-field chrome", () => {
	test("renders helperText and tooltip, and the control is described by the helper", async () => {
		const node = s.form({ query: async () => ({ items: [{ value: "" }] }) }, [
			s.repeater({
				name: "items",
				fields: () => [
					textNode("value", {
						label: "Value",
						helperText: "Use the raw attribute value.",
						tooltip: "Matched exactly.",
					}),
				],
			}),
		]);
		const Wrap = wrap(() => new Response("{}"));
		const { container, getByText, getByLabelText } = render(<Wrap>{renderNode(node)}</Wrap>);
		await waitFor(() =>
			expect(container.querySelectorAll("[data-repeater-item]").length).toBe(1),
		);

		const helper = getByText("Use the raw attribute value.");
		expect(helper.getAttribute("data-testid")).toBe("field-helper-text");
		expect(getByLabelText("Matched exactly.")).toBeTruthy();
		const input = subFieldInput(container);
		expect(helper.id).not.toBe("");
		expect(input.getAttribute("aria-describedby")).toBe(helper.id);
		expect(input.getAttribute("aria-invalid")).toBeNull();
	});

	test("a row error marks the control invalid and describes it by the error id", async () => {
		const node = s.form({ query: async () => ({ items: [{ value: "" }] }) }, [
			s.repeater({
				name: "items",
				fields: () => [textNode("value", { label: "Value", helperText: "Help." })],
			}),
			s.action({ name: "save", handler: throwFieldErrors({ "items.0.value": "Required" }) }),
		]);
		const Wrap = wrap(() => new Response("{}"));
		const { container, findByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);
		await waitFor(() =>
			expect(container.querySelectorAll("[data-repeater-item]").length).toBe(1),
		);
		const save = await findByTestId("action-save");
		await act(async () => {
			fireEvent.click(save);
		});

		const error = await findByTestId("field-error-items.0.value");
		expect(error.id).not.toBe("");
		const input = subFieldInput(container);
		expect(input.getAttribute("aria-invalid")).toBe("true");
		const described = input.getAttribute("aria-describedby")?.split(" ") ?? [];
		expect(described[0]).toBe(error.id);
		expect(described).toHaveLength(2);
	});
});
