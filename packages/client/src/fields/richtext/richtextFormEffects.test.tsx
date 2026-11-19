import { expect, test } from "bun:test";
import "./lexicalCore";
import { act, fireEvent, render } from "@testing-library/react";
import {
	$createParagraphNode,
	$createTextNode,
	$getRoot,
	createEditor,
	getNearestEditorFromDOMNode,
	type SerializedEditorState,
	UNDO_COMMAND,
} from "lexical";
import { executeEffects } from "../../inertia/effects";
import { useFormController } from "../../structure/formController";
import { RichtextForm, type RichtextValue } from "./richtextField";

const SERVER_HTML = "<h2>Server title</h2>";

function serializedBody(text: string): SerializedEditorState {
	const editor = createEditor();
	editor.update(() => $getRoot().append($createParagraphNode().append($createTextNode(text))), {
		discrete: true,
	});
	return editor.getEditorState().toJSON();
}

function Form({
	initial,
	replacement = SERVER_HTML,
}: {
	initial: string | null;
	replacement?: string | SerializedEditorState;
}) {
	const form = useFormController({ initial: { body: initial } });
	const ctx = { form, notify: () => {}, t: (key: string) => key };
	return (
		<>
			<RichtextForm
				name="body"
				value={form.data.body as RichtextValue | null}
				onChange={(value) => form.set("body", value)}
			/>
			<button
				type="button"
				onClick={() =>
					executeEffects([{ kind: "setFormData", data: { body: replacement } }], ctx)
				}
			>
				Replace body
			</button>
			<button type="button" onClick={() => executeEffects([{ kind: "resetForm" }], ctx)}>
				Reset form
			</button>
			<output>{JSON.stringify({ body: form.data.body, dirty: form.isDirty })}</output>
		</>
	);
}

test("setFormData replaces the visible richtext without rewriting the supplied value", () => {
	const view = render(<Form initial="Original text" />);
	const editable = view.getByRole("textbox");
	expect(editable.textContent).toBe("Original text");

	fireEvent.click(view.getByRole("button", { name: "Replace body" }));

	expect(view.getByRole("status").textContent).toBe(
		JSON.stringify({ body: SERVER_HTML, dirty: true }),
	);
	expect(editable.querySelector("h2")?.textContent).toBe("Server title");
});

test("setFormData accepts a serialized Lexical document", () => {
	const replacement = serializedBody("Serialized replacement");
	const view = render(<Form initial="Original text" replacement={replacement} />);

	fireEvent.click(view.getByRole("button", { name: "Replace body" }));

	expect(view.getByRole("status").textContent).toBe(
		JSON.stringify({ body: replacement, dirty: true }),
	);
	expect(view.getByRole("textbox").textContent).toBe("Serialized replacement");
});

test.each([
	"Original text",
	null,
])("resetForm restores richtext to %j after an edit", async (initial) => {
	const view = render(<Form initial={initial} />);
	const editable = await view.findByRole("textbox");
	const editor = getNearestEditorFromDOMNode(editable);
	if (!editor) {
		throw new Error("Expected a mounted Lexical editor");
	}

	act(() => {
		editor.update(
			() =>
				$getRoot()
					.clear()
					.append($createParagraphNode().append($createTextNode("Draft"))),
			{ discrete: true },
		);
	});
	expect(editable.textContent).toBe("Draft");
	expect(view.getByRole("status").textContent).toContain('"dirty":true');

	fireEvent.click(view.getByRole("button", { name: "Reset form" }));

	expect(view.getByRole("status").textContent).toBe(
		JSON.stringify({ body: initial, dirty: false }),
	);
	expect(editable.textContent).toBe(initial ?? "");
	await act(async () => {
		editor.dispatchCommand(UNDO_COMMAND, undefined);
	});
	expect(editable.textContent).toBe(initial ?? "");
});
