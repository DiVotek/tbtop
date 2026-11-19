import "./lexicalCore";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import {
	$createParagraphNode,
	$getRoot,
	$isParagraphNode,
	$setSelection,
	CLEAR_HISTORY_COMMAND,
	type EditorState,
	HISTORY_MERGE_TAG,
	type LexicalEditor,
	type SerializedEditorState,
} from "lexical";
import { useEffect, useRef } from "react";
import { isEqual } from "../../structure/formController";
import { resolveInitialEditorState } from "./richtextInitialState";

type EditorValue = SerializedEditorState | string | null;

function replaceDocument(editor: LexicalEditor, value: EditorValue): void {
	const initializer = resolveInitialEditorState(value);
	const state = typeof initializer === "string" ? editor.parseEditorState(initializer) : null;
	// A server echo can have different JSON but import to exactly the same document.
	if (state && isEqual(state.toJSON(), editor.getEditorState().toJSON())) {
		return;
	}
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

function isPlainEmpty(state: EditorState): boolean {
	return state.read(() => {
		const root = $getRoot();
		const paragraph = root.getFirstChild();
		return (
			root.getChildrenSize() === 1 &&
			$isParagraphNode(paragraph) &&
			paragraph.isEmpty() &&
			!paragraph.getFormatType() &&
			!paragraph.getIndent() &&
			!paragraph.getDirection() &&
			!paragraph.getTextFormat() &&
			!paragraph.getTextStyle()
		);
	});
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
				const next = isPlainEmpty(state) ? null : state.toJSON();
				// The form's echo of a local edit must not reload the document.
				appliedValue.current = next;
				onChange(next);
			}}
		/>
	);
}
