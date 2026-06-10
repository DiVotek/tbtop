import { $createCodeNode, $isCodeNode } from "@lexical/code";
import { $isLinkNode, TOGGLE_LINK_COMMAND } from "@lexical/link";
import {
	$isListNode,
	INSERT_ORDERED_LIST_COMMAND,
	INSERT_UNORDERED_LIST_COMMAND,
	ListNode,
} from "@lexical/list";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
	$createHeadingNode,
	$createQuoteNode,
	$isHeadingNode,
	type HeadingTagType,
} from "@lexical/rich-text";
import { $setBlocksType } from "@lexical/selection";
import { $getNearestNodeOfType } from "@lexical/utils";
import {
	$createParagraphNode,
	$getSelection,
	$isRangeSelection,
	FORMAT_TEXT_COMMAND,
	REDO_COMMAND,
	UNDO_COMMAND,
} from "lexical";
import {
	Bold,
	Code,
	Heading1,
	Heading2,
	Heading3,
	Italic,
	Link,
	List,
	ListOrdered,
	Quote,
	Redo,
	Strikethrough,
	Underline,
	Undo,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

const ICON_SIZE = 18;

function cn(...parts: Array<string | false | null | undefined>): string {
	return parts.filter(Boolean).join(" ");
}

interface ToolbarButtonProps {
	onClick: () => void;
	active?: boolean;
	title: string;
	children: React.ReactNode;
}

function ToolbarButton({ onClick, active, title, children }: ToolbarButtonProps) {
	return (
		<button
			type="button"
			onClick={onClick}
			title={title}
			className={cn(
				"flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors",
				active && "bg-muted text-foreground",
			)}
		>
			{children}
		</button>
	);
}

function Separator() {
	return <div className="mx-1.5 h-6 w-px bg-border" />;
}

export function Toolbar() {
	const [editor] = useLexicalComposerContext();
	const [isBold, setIsBold] = useState(false);
	const [isItalic, setIsItalic] = useState(false);
	const [isUnderline, setIsUnderline] = useState(false);
	const [isStrikethrough, setIsStrikethrough] = useState(false);
	const [isLink, setIsLink] = useState(false);
	const [blockType, setBlockType] = useState<string>("paragraph");

	// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Lexical selection-state wiring
	const updateToolbar = useCallback(() => {
		const selection = $getSelection();
		if (!$isRangeSelection(selection)) {
			return;
		}

		setIsBold(selection.hasFormat("bold"));
		setIsItalic(selection.hasFormat("italic"));
		setIsUnderline(selection.hasFormat("underline"));
		setIsStrikethrough(selection.hasFormat("strikethrough"));

		const anchorNode = selection.anchor.getNode();
		const element =
			anchorNode.getKey() === "root" ? anchorNode : anchorNode.getTopLevelElementOrThrow();

		if ($isHeadingNode(element)) {
			setBlockType(element.getTag());
		} else if ($isListNode(element)) {
			setBlockType(element.getListType() === "number" ? "ol" : "ul");
		} else if ($isCodeNode(element)) {
			setBlockType("code");
		} else {
			const parentList = $getNearestNodeOfType(anchorNode, ListNode);
			if (parentList) {
				setBlockType(parentList.getListType() === "number" ? "ol" : "ul");
			} else {
				setBlockType(element.getType());
			}
		}

		const parent = anchorNode.getParent();
		setIsLink($isLinkNode(parent) || $isLinkNode(anchorNode));
	}, []);

	useEffect(() => {
		return editor.registerUpdateListener(({ editorState }) => {
			editorState.read(() => updateToolbar());
		});
	}, [editor, updateToolbar]);

	const formatHeading = (tag: HeadingTagType) => {
		editor.update(() => {
			const selection = $getSelection();
			if (!$isRangeSelection(selection)) {
				return;
			}
			if (blockType === tag) {
				$setBlocksType(selection, () => $createParagraphNode());
			} else {
				$setBlocksType(selection, () => $createHeadingNode(tag));
			}
		});
	};

	const formatQuote = () => {
		editor.update(() => {
			const selection = $getSelection();
			if (!$isRangeSelection(selection)) {
				return;
			}
			if (blockType === "quote") {
				$setBlocksType(selection, () => $createParagraphNode());
			} else {
				$setBlocksType(selection, () => $createQuoteNode());
			}
		});
	};

	const formatCode = () => {
		editor.update(() => {
			const selection = $getSelection();
			if (!$isRangeSelection(selection)) {
				return;
			}
			if (blockType === "code") {
				$setBlocksType(selection, () => $createParagraphNode());
			} else {
				$setBlocksType(selection, () => $createCodeNode());
			}
		});
	};

	const insertLink = () => {
		if (isLink) {
			editor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
			return;
		}
		const url = prompt("Enter URL");
		if (url) {
			editor.dispatchCommand(TOGGLE_LINK_COMMAND, url);
		}
	};

	return (
		<div className="flex items-center gap-1 border-b px-2 py-1.5 flex-wrap">
			<ToolbarButton
				onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold")}
				active={isBold}
				title="Bold"
			>
				<Bold size={ICON_SIZE} />
			</ToolbarButton>
			<ToolbarButton
				onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic")}
				active={isItalic}
				title="Italic"
			>
				<Italic size={ICON_SIZE} />
			</ToolbarButton>
			<ToolbarButton
				onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "underline")}
				active={isUnderline}
				title="Underline"
			>
				<Underline size={ICON_SIZE} />
			</ToolbarButton>
			<ToolbarButton
				onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "strikethrough")}
				active={isStrikethrough}
				title="Strikethrough"
			>
				<Strikethrough size={ICON_SIZE} />
			</ToolbarButton>

			<Separator />

			<ToolbarButton
				onClick={() => formatHeading("h1")}
				active={blockType === "h1"}
				title="Heading 1"
			>
				<Heading1 size={ICON_SIZE} />
			</ToolbarButton>
			<ToolbarButton
				onClick={() => formatHeading("h2")}
				active={blockType === "h2"}
				title="Heading 2"
			>
				<Heading2 size={ICON_SIZE} />
			</ToolbarButton>
			<ToolbarButton
				onClick={() => formatHeading("h3")}
				active={blockType === "h3"}
				title="Heading 3"
			>
				<Heading3 size={ICON_SIZE} />
			</ToolbarButton>

			<Separator />

			<ToolbarButton
				onClick={() => editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined)}
				active={blockType === "ul"}
				title="Bullet list"
			>
				<List size={ICON_SIZE} />
			</ToolbarButton>
			<ToolbarButton
				onClick={() => editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined)}
				active={blockType === "ol"}
				title="Ordered list"
			>
				<ListOrdered size={ICON_SIZE} />
			</ToolbarButton>

			<Separator />

			<ToolbarButton onClick={insertLink} active={isLink} title="Link">
				<Link size={ICON_SIZE} />
			</ToolbarButton>
			<ToolbarButton onClick={formatCode} active={blockType === "code"} title="Code block">
				<Code size={ICON_SIZE} />
			</ToolbarButton>
			<ToolbarButton onClick={formatQuote} active={blockType === "quote"} title="Quote">
				<Quote size={ICON_SIZE} />
			</ToolbarButton>

			<Separator />

			<ToolbarButton
				onClick={() => editor.dispatchCommand(UNDO_COMMAND, undefined)}
				title="Undo"
			>
				<Undo size={ICON_SIZE} />
			</ToolbarButton>
			<ToolbarButton
				onClick={() => editor.dispatchCommand(REDO_COMMAND, undefined)}
				title="Redo"
			>
				<Redo size={ICON_SIZE} />
			</ToolbarButton>
		</div>
	);
}
