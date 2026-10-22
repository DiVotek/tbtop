import { describe, expect, it } from "bun:test";
import { $getSelection, createEditor } from "lexical";
import { RICHTEXT_NODES } from "./richtextConfig";
import { resolveInitialEditorState } from "./richtextInitialState";

function mountFrom(value: string) {
	const init = resolveInitialEditorState(value);
	if (typeof init !== "function") {
		throw new TypeError("expected an initializer for an HTML value");
	}
	const editor = createEditor({
		nodes: RICHTEXT_NODES,
		onError: (error) => {
			throw error;
		},
	});
	editor.update(() => init(editor), { discrete: true });
	return editor;
}

describe("resolveInitialEditorState", () => {
	// A selection in the initial state is applied to the DOM on first commit,
	// which focuses the editor and scrolls the page to it on load. happy-dom
	// does not move focus on a DOM selection, so assert the cause directly.
	it("leaves no selection behind when loading an HTML string", () => {
		const editor = mountFrom("<h2>Title</h2><p>Body</p>");
		const selection = editor.getEditorState().read(() => $getSelection());
		expect(selection).toBeNull();
	});

	it("still loads the HTML content", () => {
		const editor = mountFrom("<h2>Title</h2><p>Body</p>");
		const json = JSON.stringify(editor.getEditorState().toJSON());
		expect(json).toContain('"tag":"h2"');
		expect(json).toContain("Body");
	});
});
