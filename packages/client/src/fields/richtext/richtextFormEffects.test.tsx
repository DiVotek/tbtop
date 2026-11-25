import { expect, test } from "bun:test";
import "./lexicalCore";
import { $createHeadingNode } from "@lexical/rich-text";
import { act, fireEvent, render } from "@testing-library/react";
import {
	$createParagraphNode,
	$createTextNode,
	$getRoot,
	$getSelection,
	createEditor,
	getNearestEditorFromDOMNode,
	HISTORY_PUSH_TAG,
	type LexicalEditor,
	type SerializedEditorState,
	UNDO_COMMAND,
} from "lexical";
import { executeEffects } from "../../inertia/effects";
import { useFormController } from "../../structure/formController";
import { RichtextForm, type RichtextValue } from "./richtextField";

const SERVER_HTML = "<h2>Server title</h2>";

function mountedEditor(editable: HTMLElement): LexicalEditor {
	const editor = getNearestEditorFromDOMNode(editable);
	if (!editor) {
		throw new Error("Expected a mounted Lexical editor");
	}
	return editor;
}

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
	replacement?: string | SerializedEditorState | null;
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
	const editor = mountedEditor(editable);

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

test.each([
	"Reset form",
	"Replace body",
])("%s clears an empty heading when the target value is null", (action) => {
	const view = render(<Form initial={null} replacement={null} />);
	const editable = view.getByRole("textbox");
	const editor = mountedEditor(editable);
	act(() => {
		editor.update(() => $getRoot().clear().append($createHeadingNode("h2")), {
			discrete: true,
		});
	});
	expect(editable.firstElementChild?.tagName).toBe("H2");

	fireEvent.click(view.getByRole("button", { name: action }));

	expect(editable.firstElementChild?.tagName).toBe("P");
	expect(view.getByRole("status").textContent).toBe('{"body":null,"dirty":false}');
});

test("an equivalent saved document preserves the selection and undo history", async () => {
	const onChange = () => {};
	const tree = (value: RichtextValue | null) => (
		<RichtextForm name="body" value={value} onChange={onChange} />
	);
	const view = render(tree(null));
	const editable = view.getByRole("textbox");
	const editor = mountedEditor(editable);
	act(() => {
		editor.update(
			() =>
				$getRoot()
					.clear()
					.append($createParagraphNode().append($createTextNode("Draft"))),
			{ discrete: true, tag: HISTORY_PUSH_TAG },
		);
	});
	await act(async () => {
		editor.update(
			() => {
				const text = $createTextNode("Saved text");
				$getRoot().clear().append($createParagraphNode().append(text));
				text.select(3, 3);
			},
			{ discrete: true, tag: HISTORY_PUSH_TAG },
		);
	});
	const draft = editor.getEditorState();
	const selection = draft.read($getSelection);
	expect(selection).not.toBeNull();
	const { root } = draft.toJSON();
	const returnedRoot = { ...root, serverMetadata: true };
	view.rerender(tree({ root: returnedRoot }));

	expect(editor.getEditorState().read($getSelection)).toEqual(selection);
	await act(async () => {
		editor.dispatchCommand(UNDO_COMMAND, undefined);
	});
	expect(editable.textContent).toBe("Draft");
});
