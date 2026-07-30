import { $generateNodesFromDOM } from "@lexical/html";
import type { LexicalEditor, SerializedEditorState } from "lexical";
import { $getRoot, $insertNodes } from "lexical";

type InitialEditorState = string | ((editor: LexicalEditor) => void) | undefined;

// Values that predate the Lexical editor arrive as strings: either raw HTML
// (rendered as markup) or plain text (wrapped in a single paragraph).
const looksLikeHtml = (value: string): boolean => /^\s*</.test(value);

function htmlInitializer(html: string): (editor: LexicalEditor) => void {
	return (editor) => {
		const dom = new DOMParser().parseFromString(html, "text/html");
		const nodes = $generateNodesFromDOM(editor, dom);
		$getRoot().select();
		$insertNodes(nodes);
	};
}

function plainTextState(text: string): string {
	return JSON.stringify({
		root: {
			children: [
				{
					children: [
						{
							detail: 0,
							format: 0,
							mode: "normal",
							style: "",
							text,
							type: "text",
							version: 1,
						},
					],
					direction: "ltr",
					format: "",
					indent: 0,
					type: "paragraph",
					version: 1,
				},
			],
			direction: "ltr",
			format: "",
			indent: 0,
			type: "root",
			version: 1,
		},
	});
}

// Resolve a stored Lexical state — or a legacy string (HTML or plain text) —
// into what LexicalComposer's `editorState` accepts. Shared by the editor and
// the read-only view.
export function resolveInitialEditorState(
	value: SerializedEditorState | string | null,
): InitialEditorState {
	if (!value) {
		return undefined;
	}
	if (typeof value === "string") {
		return looksLikeHtml(value) ? htmlInitializer(value) : plainTextState(value);
	}
	return JSON.stringify(value);
}
