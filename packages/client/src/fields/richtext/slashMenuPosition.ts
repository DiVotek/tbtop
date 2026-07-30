export interface SlashMenuPosition {
	top: number;
	left: number;
}

export function caretPosition(editorRoot: HTMLElement | null): SlashMenuPosition | null {
	const nativeSelection = window.getSelection();
	if (!editorRoot || !nativeSelection || nativeSelection.rangeCount === 0) {
		return null;
	}
	const rect = nativeSelection.getRangeAt(0).getBoundingClientRect();
	const editorRect = editorRoot.getBoundingClientRect();
	return { top: rect.bottom - editorRect.top + 4, left: rect.left - editorRect.left };
}
