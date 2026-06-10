import { $createCodeNode } from "@lexical/code";
import { INSERT_ORDERED_LIST_COMMAND, INSERT_UNORDERED_LIST_COMMAND } from "@lexical/list";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $createHeadingNode, $createQuoteNode } from "@lexical/rich-text";
import { $setBlocksType } from "@lexical/selection";
import { $getSelection, $isRangeSelection, TextNode } from "lexical";
import { Code, Heading1, Heading2, Heading3, List, ListOrdered, Quote } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface SlashCommand {
	label: string;
	keywords: string[];
	icon: React.ReactNode;
	action: () => void;
}

const ICON_SIZE = 16;

function cn(...parts: Array<string | false | null | undefined>): string {
	return parts.filter(Boolean).join(" ");
}

function caretPosition(editorRoot: HTMLElement | null): { top: number; left: number } | null {
	const nativeSelection = window.getSelection();
	if (!editorRoot || !nativeSelection || nativeSelection.rangeCount === 0) {
		return null;
	}
	const rect = nativeSelection.getRangeAt(0).getBoundingClientRect();
	const editorRect = editorRoot.getBoundingClientRect();
	return { top: rect.bottom - editorRect.top + 4, left: rect.left - editorRect.left };
}

export function SlashMenuPlugin() {
	const [editor] = useLexicalComposerContext();
	const [isOpen, setIsOpen] = useState(false);
	const [query, setQuery] = useState("");
	const [selectedIndex, setSelectedIndex] = useState(0);
	const [position, setPosition] = useState({ top: 0, left: 0 });
	const menuRef = useRef<HTMLDivElement>(null);

	const commands: SlashCommand[] = [
		{
			label: "Heading 1",
			keywords: ["h1", "heading", "title"],
			icon: <Heading1 size={ICON_SIZE} />,
			action: () => {
				editor.update(() => {
					const selection = $getSelection();
					if ($isRangeSelection(selection)) {
						$setBlocksType(selection, () => $createHeadingNode("h1"));
					}
				});
			},
		},
		{
			label: "Heading 2",
			keywords: ["h2", "heading", "subtitle"],
			icon: <Heading2 size={ICON_SIZE} />,
			action: () => {
				editor.update(() => {
					const selection = $getSelection();
					if ($isRangeSelection(selection)) {
						$setBlocksType(selection, () => $createHeadingNode("h2"));
					}
				});
			},
		},
		{
			label: "Heading 3",
			keywords: ["h3", "heading"],
			icon: <Heading3 size={ICON_SIZE} />,
			action: () => {
				editor.update(() => {
					const selection = $getSelection();
					if ($isRangeSelection(selection)) {
						$setBlocksType(selection, () => $createHeadingNode("h3"));
					}
				});
			},
		},
		{
			label: "Bullet list",
			keywords: ["bullet", "ul", "unordered", "list"],
			icon: <List size={ICON_SIZE} />,
			action: () => {
				editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
			},
		},
		{
			label: "Ordered list",
			keywords: ["ordered", "ol", "number", "list"],
			icon: <ListOrdered size={ICON_SIZE} />,
			action: () => {
				editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
			},
		},
		{
			label: "Code block",
			keywords: ["code", "pre", "snippet"],
			icon: <Code size={ICON_SIZE} />,
			action: () => {
				editor.update(() => {
					const selection = $getSelection();
					if ($isRangeSelection(selection)) {
						$setBlocksType(selection, () => $createCodeNode());
					}
				});
			},
		},
		{
			label: "Quote",
			keywords: ["quote", "blockquote"],
			icon: <Quote size={ICON_SIZE} />,
			action: () => {
				editor.update(() => {
					const selection = $getSelection();
					if ($isRangeSelection(selection)) {
						$setBlocksType(selection, () => $createQuoteNode());
					}
				});
			},
		},
	];

	const filtered = query
		? commands.filter(
				(cmd) =>
					cmd.label.toLowerCase().includes(query.toLowerCase()) ||
					cmd.keywords.some((k) => k.includes(query.toLowerCase())),
			)
		: commands;

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
					if (isOpen) close();
					return;
				}

				const anchorNode = selection.anchor.getNode();
				if (!(anchorNode instanceof TextNode)) {
					if (isOpen) close();
					return;
				}

				const nodeText = anchorNode.getTextContent();
				const offset = selection.anchor.offset;
				const textBefore = nodeText.slice(0, offset);

				const match = textBefore.match(/(?:^|\s)\/([^\s]*)$/);
				if (!match) {
					if (isOpen) close();
					return;
				}

				const q = match[1] ?? "";
				setQuery(q);
				setSelectedIndex(0);

				if (!isOpen) {
					const pos = caretPosition(editor.getRootElement());
					if (pos) setPosition(pos);
					setIsOpen(true);
				}
			});
		});
	}, [editor, isOpen, close]);

	useEffect(() => {
		if (!isOpen) return;
		const root = editor.getRootElement();
		if (!root) return;

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

	if (!isOpen || filtered.length === 0) return null;

	const editorRoot = editor.getRootElement();
	if (!editorRoot) return null;

	return createPortal(
		<div
			ref={menuRef}
			className="absolute z-50 w-56 rounded-md border bg-popover p-1 shadow-md"
			style={{ top: position.top, left: position.left }}
		>
			{filtered.map((cmd, index) => (
				<button
					key={cmd.label}
					type="button"
					className={cn(
						"flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm transition-colors",
						index === selectedIndex
							? "bg-accent text-accent-foreground"
							: "text-foreground hover:bg-accent hover:text-accent-foreground",
					)}
					onMouseEnter={() => setSelectedIndex(index)}
					onMouseDown={(e) => {
						e.preventDefault();
						executeCommand(index);
					}}
				>
					<span className="flex h-5 w-5 items-center justify-center text-muted-foreground">
						{cmd.icon}
					</span>
					{cmd.label}
				</button>
			))}
		</div>,
		editorRoot.parentElement ?? editorRoot,
	);
}
