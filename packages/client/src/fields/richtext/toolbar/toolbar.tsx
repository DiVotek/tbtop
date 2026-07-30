import { $createCodeNode } from "@lexical/code";
import { $isLinkNode } from "@lexical/link";
import { INSERT_ORDERED_LIST_COMMAND, INSERT_UNORDERED_LIST_COMMAND } from "@lexical/list";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $createHeadingNode, $createQuoteNode } from "@lexical/rich-text";
import { $setBlocksType } from "@lexical/selection";
import {
	$createParagraphNode,
	$getSelection,
	$isRangeSelection,
	type ElementNode,
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
import { useState } from "react";
import { useTranslation } from "../../../i18n/i18n";
import { LinkDialog, type LinkDialogRequest } from "../linkDialog";
import { ToolbarButton } from "./ToolbarButton";
import { useToolbarState } from "./useToolbarState";

function Separator() {
	return <div className="mx-1.5 h-6 w-px bg-border" />;
}

const TEXT_FORMATS = [
	{ format: "bold", Icon: Bold, key: "isBold", label: "bold" },
	{ format: "italic", Icon: Italic, key: "isItalic", label: "italic" },
	{ format: "underline", Icon: Underline, key: "isUnderline", label: "underline" },
	{
		format: "strikethrough",
		Icon: Strikethrough,
		key: "isStrikethrough",
		label: "strikethrough",
	},
] as const;

export function Toolbar() {
	const t = useTranslation();
	const [editor] = useLexicalComposerContext();
	const state = useToolbarState(editor);
	const [linkRequest, setLinkRequest] = useState<LinkDialogRequest | null>(null);

	const setBlock = <T extends ElementNode>(create: () => T, tag: string) => {
		editor.update(() => {
			const selection = $getSelection();
			if (!$isRangeSelection(selection)) {
				return;
			}
			if (state.blockType === tag) {
				$setBlocksType(selection, $createParagraphNode);
			} else {
				$setBlocksType(selection, create);
			}
		});
	};

	const openLinkDialog = () => {
		editor.getEditorState().read(() => {
			const selection = $getSelection();
			if (!$isRangeSelection(selection)) {
				return;
			}
			const anchorNode = selection.anchor.getNode();
			const parent = anchorNode.getParent();
			let linkNode = null;
			if ($isLinkNode(parent)) {
				linkNode = parent;
			} else if ($isLinkNode(anchorNode)) {
				linkNode = anchorNode;
			}
			setLinkRequest({
				selection: selection.clone(),
				currentUrl: linkNode?.getURL() ?? null,
			});
		});
	};

	return (
		<div className="flex items-center gap-1 border-b px-2 py-1.5 flex-wrap">
			{TEXT_FORMATS.map(({ format, Icon, key, label }) => (
				<ToolbarButton
					key={format}
					onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, format)}
					active={state[key]}
					label={t(`field.richtext.${label}`)}
				>
					<Icon />
				</ToolbarButton>
			))}

			<Separator />

			<ToolbarButton
				onClick={() => setBlock(() => $createHeadingNode("h1"), "h1")}
				active={state.blockType === "h1"}
				label={t("field.richtext.heading1")}
			>
				<Heading1 />
			</ToolbarButton>
			<ToolbarButton
				onClick={() => setBlock(() => $createHeadingNode("h2"), "h2")}
				active={state.blockType === "h2"}
				label={t("field.richtext.heading2")}
			>
				<Heading2 />
			</ToolbarButton>
			<ToolbarButton
				onClick={() => setBlock(() => $createHeadingNode("h3"), "h3")}
				active={state.blockType === "h3"}
				label={t("field.richtext.heading3")}
			>
				<Heading3 />
			</ToolbarButton>

			<Separator />

			<ToolbarButton
				onClick={() => editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined)}
				active={state.blockType === "ul"}
				label={t("field.richtext.bullet_list")}
			>
				<List />
			</ToolbarButton>
			<ToolbarButton
				onClick={() => editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined)}
				active={state.blockType === "ol"}
				label={t("field.richtext.ordered_list")}
			>
				<ListOrdered />
			</ToolbarButton>

			<Separator />

			<ToolbarButton
				onClick={openLinkDialog}
				active={state.isLink}
				label={t("field.richtext.link")}
			>
				<Link />
			</ToolbarButton>
			<ToolbarButton
				onClick={() => setBlock($createCodeNode, "code")}
				active={state.blockType === "code"}
				label={t("field.richtext.code_block")}
			>
				<Code />
			</ToolbarButton>
			<ToolbarButton
				onClick={() => setBlock($createQuoteNode, "quote")}
				active={state.blockType === "quote"}
				label={t("field.richtext.quote")}
			>
				<Quote />
			</ToolbarButton>

			<Separator />

			<ToolbarButton
				onClick={() => editor.dispatchCommand(UNDO_COMMAND, undefined)}
				label={t("field.richtext.undo")}
			>
				<Undo />
			</ToolbarButton>
			<ToolbarButton
				onClick={() => editor.dispatchCommand(REDO_COMMAND, undefined)}
				label={t("field.richtext.redo")}
			>
				<Redo />
			</ToolbarButton>

			<LinkDialog
				editor={editor}
				request={linkRequest}
				onClose={() => setLinkRequest(null)}
			/>
		</div>
	);
}
