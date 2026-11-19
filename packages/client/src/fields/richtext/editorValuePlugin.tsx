import "./lexicalCore";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import {
	$createParagraphNode,
	$getRoot,
	$setSelection,
	CLEAR_HISTORY_COMMAND,
	HISTORY_MERGE_TAG,
	type LexicalEditor,
	type SerializedEditorState,
} from "lexical";
import { useEffect, useRef } from "react";
import { isEqual } from "../../structure/formController";
import { resolveInitialEditorState } from "./richtextInitialState";
import { hasEmbedNode, lexicalToPlainText } from "./textPreview";

type EditorValue = SerializedEditorState | string | null;

function replaceDocument(editor: LexicalEditor, value: EditorValue): void {
	const initializer = resolveInitialEditorState(value);
	const state = typeof initializer === "string" ? editor.parseEditorState(initializer) : null;
	editor.dispatchCommand(CLEAR_HISTORY_COMMAND, undefined);
	if (state && !state.isEmpty()) {
		editor.setEditorState(state, { tag: HISTORY_MERGE_TAG });
		return;
	}
	editor.update(
		() => {
			const root = $getRoot().clear();
			if (typeof initializer === "function") {
				initializer(editor);
			}
			if (root.isEmpty()) {
				root.append($createParagraphNode());
			}
			$setSelection(null);
		},
		{ discrete: true, tag: HISTORY_MERGE_TAG },
	);
}

export function EditorValuePlugin({
	value,
	onChange,
}: {
	value: EditorValue;
	onChange: (state: SerializedEditorState | null) => void;
}) {
	const [editor] = useLexicalComposerContext();
	const appliedValue = useRef(value);

	useEffect(() => {
		if (isEqual(appliedValue.current, value)) {
			return;
		}
		appliedValue.current = value;
		replaceDocument(editor, value);
	}, [editor, value]);

	return (
		<OnChangePlugin
			ignoreSelectionChange
			ignoreHistoryMergeTagChange
			onChange={(state) => {
				const doc = state.toJSON();
				const next = !hasEmbedNode(doc) && lexicalToPlainText(doc) === "" ? null : doc;
				// The form's echo of a local edit must not reload the document.
				appliedValue.current = next;
				onChange(next);
			}}
		/>
	);
}
