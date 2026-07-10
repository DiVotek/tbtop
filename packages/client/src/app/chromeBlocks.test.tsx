/**
 * Tests for UnsavedIndicatorBlock ($s->unsavedIndicator() on the wire).
 *
 * Renders the block directly via renderNode + a FormControllerProvider,
 * mirroring the direct-mount pattern in fieldDependencies.test.tsx — the
 * indicator reads dirty state from React context (useFormDirty), not from
 * its own node options, so there is nothing form-shaped to materialize.
 */
import { describe, expect, test } from "bun:test";
import { act, render } from "@testing-library/react";
import { ensureBuiltinsRegistered } from "../render/registerBuiltins";
import { renderNode } from "../render/structureRenderer";
import { FormControllerProvider } from "../structure/formContext";
import { useFormController } from "../structure/formController";
import type { FormController, StructureNode } from "../structure/types";

ensureBuiltinsRegistered();

function unsavedIndicatorNode(label?: string): StructureNode {
	return {
		kind: "unsavedIndicator",
		options: label !== undefined ? { label } : {},
		meta: {},
	} as StructureNode;
}

interface Capture {
	ctrls: FormController[];
}

function renderInsideForm(initial: Record<string, unknown>, label?: string) {
	const cap: Capture = { ctrls: [] };
	function Harness() {
		const ctrl = useFormController({ initial });
		cap.ctrls.push(ctrl);
		return (
			<FormControllerProvider value={ctrl}>
				{renderNode(unsavedIndicatorNode(label))}
			</FormControllerProvider>
		);
	}
	const result = render(<Harness />);
	return { cap, ...result };
}

describe("UnsavedIndicatorBlock — inside a form", () => {
	test("renders nothing while the form is clean", () => {
		const { queryByTestId } = renderInsideForm({ title: "Hello" });
		expect(queryByTestId("unsaved-indicator")).toBeNull();
	});

	test("appears once the form becomes dirty, with the default translated text", () => {
		const { cap, queryByTestId, getByTestId } = renderInsideForm({ title: "Hello" });
		expect(queryByTestId("unsaved-indicator")).toBeNull();

		act(() => cap.ctrls.at(-1)?.set("title", "Changed"));

		const el = getByTestId("unsaved-indicator");
		expect(el.textContent).toContain("Unsaved changes");
	});

	test("a label option overrides the default text", () => {
		const { cap, getByTestId } = renderInsideForm({ title: "Hello" }, "Custom label");
		act(() => cap.ctrls.at(-1)?.set("title", "Changed"));

		expect(getByTestId("unsaved-indicator").textContent).toContain("Custom label");
	});

	test("disappears again once the form is reset (simulated post-save)", () => {
		const { cap, queryByTestId, getByTestId } = renderInsideForm({ title: "Hello" });
		act(() => cap.ctrls.at(-1)?.set("title", "Changed"));
		expect(getByTestId("unsaved-indicator")).not.toBeNull();

		act(() => cap.ctrls.at(-1)?.reset());
		expect(queryByTestId("unsaved-indicator")).toBeNull();
	});

	test('the container carries aria-live="polite"', () => {
		const { cap, getByTestId } = renderInsideForm({ title: "Hello" });
		act(() => cap.ctrls.at(-1)?.set("title", "Changed"));

		expect(getByTestId("unsaved-indicator").getAttribute("aria-live")).toBe("polite");
	});
});

describe("UnsavedIndicatorBlock — outside a form", () => {
	test("renders nothing when there is no enclosing form", () => {
		const { queryByTestId } = render(renderNode(unsavedIndicatorNode()));
		expect(queryByTestId("unsaved-indicator")).toBeNull();
	});
});
