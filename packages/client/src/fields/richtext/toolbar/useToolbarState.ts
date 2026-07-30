import { $isCodeNode } from "@lexical/code";
import { $isLinkNode } from "@lexical/link";
import { $isListNode, ListNode } from "@lexical/list";
import { $isHeadingNode } from "@lexical/rich-text";
import { $getNearestNodeOfType } from "@lexical/utils";
import type { LexicalEditor } from "lexical";
import { $getSelection, $isRangeSelection } from "lexical";
import { useCallback, useEffect, useState } from "react";

export interface ToolbarState {
	isBold: boolean;
	isItalic: boolean;
	isUnderline: boolean;
	isStrikethrough: boolean;
	isLink: boolean;
	blockType: string;
}

// Extracted from the toolbar component: derives active/pressed button state
// from the current Lexical selection on every editor update.
export function useToolbarState(editor: LexicalEditor): ToolbarState {
	const [state, setState] = useState<ToolbarState>({
		isBold: false,
		isItalic: false,
		isUnderline: false,
		isStrikethrough: false,
		isLink: false,
		blockType: "paragraph",
	});

	// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Lexical selection-state wiring
	const updateToolbar = useCallback(() => {
		const selection = $getSelection();
		if (!$isRangeSelection(selection)) {
			return;
		}

		const anchorNode = selection.anchor.getNode();
		const element =
			anchorNode.getKey() === "root" ? anchorNode : anchorNode.getTopLevelElementOrThrow();

		let blockType: string;
		if ($isHeadingNode(element)) {
			blockType = element.getTag();
		} else if ($isListNode(element)) {
			blockType = element.getListType() === "number" ? "ol" : "ul";
		} else if ($isCodeNode(element)) {
			blockType = "code";
		} else {
			const parentList = $getNearestNodeOfType(anchorNode, ListNode);
			if (parentList) {
				blockType = parentList.getListType() === "number" ? "ol" : "ul";
			} else {
				blockType = element.getType();
			}
		}

		const parent = anchorNode.getParent();
		setState({
			isBold: selection.hasFormat("bold"),
			isItalic: selection.hasFormat("italic"),
			isUnderline: selection.hasFormat("underline"),
			isStrikethrough: selection.hasFormat("strikethrough"),
			isLink: $isLinkNode(parent) || $isLinkNode(anchorNode),
			blockType,
		});
	}, []);

	useEffect(() => {
		return editor.registerUpdateListener(({ editorState }) => {
			editorState.read(() => updateToolbar());
		});
	}, [editor, updateToolbar]);

	return state;
}
