import { describe, expect, test } from "bun:test";
import { LinkNode } from "@lexical/link";
import { ListItemNode, ListNode } from "@lexical/list";
import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import { renderHook } from "@testing-library/react";
import {
	$createParagraphNode,
	$createTextNode,
	$getRoot,
	$getSelection,
	$isRangeSelection,
	$setSelection,
	createEditor,
} from "lexical";
import { useToolbarState } from "./useToolbarState";

function editorWithBoldText() {
	const editor = createEditor({
		nodes: [HeadingNode, QuoteNode, ListNode, ListItemNode, LinkNode],
		onError: (e) => {
			throw e;
		},
	});
	editor.update(
		() => {
			const text = $createTextNode("hello");
			const paragraph = $createParagraphNode().append(text);
			$getRoot().clear().append(paragraph);
			text.select(0, 5);
			const selection = $getSelection();
			if ($isRangeSelection(selection)) {
				selection.formatText("bold");
			}
		},
		{ discrete: true },
	);
	return editor;
}

describe("useToolbarState", () => {
	// The hook used to seed from its own defaults and only sync on the next editor
	// update, so a toolbar mounted over existing content showed nothing pressed.
	test("seeds from the editor state already present at mount", () => {
		const editor = editorWithBoldText();
		const { result } = renderHook(() => useToolbarState(editor));
		expect(result.current.isBold).toBe(true);
	});

	// A non-range selection cannot carry formatting; leaving the previous flags on
	// screen showed bold as active for a selection that has no format at all.
	test("clears formatting flags when the selection is no longer a range", () => {
		const editor = editorWithBoldText();
		const { result, rerender } = renderHook(() => useToolbarState(editor));
		expect(result.current.isBold).toBe(true);

		editor.update(
			() => {
				$setSelection(null);
			},
			{ discrete: true },
		);
		rerender();

		expect(result.current.isBold).toBe(false);
		expect(result.current.blockType).toBe("paragraph");
	});
});
