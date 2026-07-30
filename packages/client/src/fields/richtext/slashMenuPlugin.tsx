import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $getSelection, $isRangeSelection, TextNode } from "lexical";
import { useCallback, useEffect, useState } from "react";
import { useSlashCommands } from "./slashMenuCommands";
import { SlashMenuList } from "./slashMenuList";
import { caretPosition, type SlashMenuPosition } from "./slashMenuPosition";

export function SlashMenuPlugin() {
	const [editor] = useLexicalComposerContext();
	const [isOpen, setIsOpen] = useState(false);
	const [query, setQuery] = useState("");
	const [selectedIndex, setSelectedIndex] = useState(0);
	const [position, setPosition] = useState<SlashMenuPosition>({ top: 0, left: 0 });

	const filtered = useSlashCommands(editor, query);

	const close = useCallback(() => {
		setIsOpen(false);
		setQuery("");
		setSelectedIndex(0);
	}, []);

	const executeCommand = useCallback(
		(index: number) => {
			const cmd = filtered[index];
			if (!cmd) {
				return;
			}

			editor.update(() => {
				const selection = $getSelection();
				if (!$isRangeSelection(selection)) {
					return;
				}

				const anchorNode = selection.anchor.getNode();
				if (anchorNode instanceof TextNode) {
					const text = anchorNode.getTextContent();
					const slashIdx = text.lastIndexOf("/");
					if (slashIdx >= 0) {
						const before = text.slice(0, slashIdx);
						anchorNode.setTextContent(before);
						selection.anchor.set(anchorNode.getKey(), before.length, "text");
						selection.focus.set(anchorNode.getKey(), before.length, "text");
					}
				}
			});

			setTimeout(() => cmd.action(), 0);
			close();
		},
		[editor, filtered, close],
	);

	useEffect(() => {
		return editor.registerTextContentListener((_text) => {
			// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: slash-trigger detection + caret positioning
			editor.getEditorState().read(() => {
				const selection = $getSelection();
				if (!$isRangeSelection(selection)) {
					if (isOpen) {
						close();
					}
					return;
				}

				const anchorNode = selection.anchor.getNode();
				if (!(anchorNode instanceof TextNode)) {
					if (isOpen) {
						close();
					}
					return;
				}

				const nodeText = anchorNode.getTextContent();
				const offset = selection.anchor.offset;
				const textBefore = nodeText.slice(0, offset);

				const match = textBefore.match(/(?:^|\s)\/([^\s]*)$/);
				if (!match) {
					if (isOpen) {
						close();
					}
					return;
				}

				const q = match[1] ?? "";
				setQuery(q);
				setSelectedIndex(0);

				if (!isOpen) {
					const pos = caretPosition(editor.getRootElement());
					if (pos) {
						setPosition(pos);
					}
					setIsOpen(true);
				}
			});
		});
	}, [editor, isOpen, close]);

	useEffect(() => {
		if (!isOpen) {
			return;
		}
		const root = editor.getRootElement();
		if (!root) {
			return;
		}

		// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: menu-open key interception
		function onKeyDown(e: KeyboardEvent) {
			if (e.key === "ArrowDown") {
				e.preventDefault();
				e.stopPropagation();
				setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
				return;
			}
			if (e.key === "ArrowUp") {
				e.preventDefault();
				e.stopPropagation();
				setSelectedIndex((i) => Math.max(i - 1, 0));
				return;
			}
			if (e.key === "Enter") {
				e.preventDefault();
				e.stopPropagation();
				executeCommand(selectedIndex);
				return;
			}
			if (e.key === "Escape") {
				e.preventDefault();
				e.stopPropagation();
				close();
			}
		}

		root.addEventListener("keydown", onKeyDown, { capture: true });
		return () => root.removeEventListener("keydown", onKeyDown, { capture: true });
	}, [editor, isOpen, filtered.length, selectedIndex, executeCommand, close]);

	if (!isOpen || filtered.length === 0) {
		return null;
	}

	const editorRoot = editor.getRootElement();
	if (!editorRoot) {
		return null;
	}

	return (
		<SlashMenuList
			commands={filtered}
			selectedIndex={selectedIndex}
			position={position}
			portalTarget={editorRoot.parentElement ?? editorRoot}
			onHover={setSelectedIndex}
			onSelect={executeCommand}
		/>
	);
}
