/**
 * Audit 5.20: action endpoints had no field-error channel — a thrown
 * ValidationException degraded to a generic toast (see envelope.test.ts for
 * the {message, errors} -> TabletopError.fields normalization), and the
 * client unconditionally reset the form before applying effects even when
 * the action halted the modal to let the user fix their input (see
 * materialize.test.ts for the haltModal-skips-reset unit coverage).
 *
 * This file proves the end-to-end UX: a modal-hosted form whose Save action
 * throws a fields-shaped error (what a thrown TabletopError looks like once
 * envelope.ts normalizes it) shows the field error inline in the modal and
 * does not wipe what the user typed.
 */
import { describe, expect, test } from "bun:test";
import { act, fireEvent, render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderNode } from "../render/structureRenderer";
import { s } from "./structure";
import { wrapForStructure as wrap } from "./testFixtures";

function fieldsError(fields: Record<string, string>): Error & { fields: Record<string, string> } {
	const err = new Error("Validation failed") as Error & { fields: Record<string, string> };
	err.fields = fields;
	return err;
}

describe("Action field-errors channel (5.20)", () => {
	test("a modal action's field error is applied to the modal's own form, not lost as a generic toast", async () => {
		const node = s.action({
			name: "create",
			label: "Create",
			modal: {
				title: "Create redirect",
				body: (sb) =>
					sb.form({}, [
						sb.text({ name: "from_path" }),
						sb.action({
							name: "save",
							label: "Save",
							handler: async () => {
								throw fieldsError({ from_path: "This path is already redirected" });
							},
						}),
					]),
			},
		});
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId } = render(<Wrap>{renderNode(node)}</Wrap>);

		await act(async () => {
			fireEvent.click(await findByTestId("action-create"));
		});
		await act(async () => {
			fireEvent.click(await findByTestId("action-save"));
		});

		const error = await findByTestId("field-error-from_path");
		expect(error.textContent).toBe("This path is already redirected");
	});

	test("the user's typed input is still there after the field error is applied — form is not reset", async () => {
		const user = userEvent.setup();
		const node = s.action({
			name: "create",
			label: "Create",
			modal: {
				title: "Create redirect",
				body: (sb) =>
					sb.form({}, [
						sb.text({ name: "from_path" }),
						sb.action({
							name: "save",
							label: "Save",
							handler: async () => {
								throw fieldsError({ from_path: "This path is already redirected" });
							},
						}),
					]),
			},
		});
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId, baseElement } = render(<Wrap>{renderNode(node)}</Wrap>);

		await act(async () => {
			fireEvent.click(await findByTestId("action-create"));
		});
		await findByTestId("action-save");
		const input = baseElement.querySelector<HTMLInputElement>('input[name="from_path"]');
		expect(input).not.toBeNull();
		await user.type(input as HTMLInputElement, "/old-path");

		await act(async () => {
			fireEvent.click(await findByTestId("action-save"));
		});
		await findByTestId("field-error-from_path");

		expect(baseElement.querySelector<HTMLInputElement>('input[name="from_path"]')?.value).toBe(
			"/old-path",
		);
	});

	test("a haltModal effect (caught server-side, no thrown error) also leaves the typed input intact", async () => {
		// Mirrors what a server action does today (RedirectsPage::haltWithErrors):
		// catch the ValidationException itself and return Effects::haltModal(...)
		// instead of letting it bubble — a 200 response, not a rejected promise.
		// c.modal.halt is exactly that effect's client-side handler.
		const node = s.action({
			name: "create",
			label: "Create",
			modal: {
				title: "Create redirect",
				body: (sb) =>
					sb.form({}, [
						sb.text({ name: "from_path" }),
						sb.action({
							name: "save",
							label: "Save",
							handler: async (c) => {
								c.modal?.halt?.("This path is already redirected", "error");
							},
						}),
					]),
			},
		});
		const user = userEvent.setup();
		const Wrap = wrap(() => new Response("{}"));
		const { findByTestId, findByText, baseElement } = render(<Wrap>{renderNode(node)}</Wrap>);

		await act(async () => {
			fireEvent.click(await findByTestId("action-create"));
		});
		await findByTestId("action-save");
		const input = baseElement.querySelector<HTMLInputElement>('input[name="from_path"]');
		await user.type(input as HTMLInputElement, "/old-path");

		await act(async () => {
			fireEvent.click(await findByTestId("action-save"));
		});
		await findByText("This path is already redirected");

		expect(baseElement.querySelector<HTMLInputElement>('input[name="from_path"]')?.value).toBe(
			"/old-path",
		);
	});
});
