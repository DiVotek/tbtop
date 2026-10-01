import "./lexicalCore";
import { $createCodeNode } from "@lexical/code";
import { INSERT_ORDERED_LIST_COMMAND, INSERT_UNORDERED_LIST_COMMAND } from "@lexical/list";
import { $createHeadingNode, $createQuoteNode } from "@lexical/rich-text";
import { $setBlocksType } from "@lexical/selection";
import { $getSelection, $isRangeSelection, type ElementNode, type LexicalEditor } from "lexical";
import { Box, Code, Heading1, Heading2, Heading3, List, ListOrdered, Quote } from "lucide-react";
import { useMemo } from "react";
import { type Translate, useTranslation } from "../../i18n/i18n";
import { NodeIcon } from "../../ui/node-icon";
import { type EmbedController, useEmbedController } from "./embedContext";

export interface SlashCommand {
	label: string;
	keywords: string[];
	icon: React.ReactNode;
	action: () => void;
	/** Heading shown above the first command of a group. */
	group?: string;
}

const ICON_SIZE = 16;

function setBlockType(editor: LexicalEditor, create: () => ElementNode) {
	editor.update(() => {
		const selection = $getSelection();
		if ($isRangeSelection(selection)) {
			$setBlocksType(selection, create);
		}
	});
}

function buildCommands(editor: LexicalEditor, t: (key: string) => string): SlashCommand[] {
	return [
		{
			label: t("field.richtext.heading1"),
			keywords: ["h1", "heading", "title"],
			icon: <Heading1 size={ICON_SIZE} />,
			action: () => setBlockType(editor, () => $createHeadingNode("h1")),
		},
		{
			label: t("field.richtext.heading2"),
			keywords: ["h2", "heading", "subtitle"],
			icon: <Heading2 size={ICON_SIZE} />,
			action: () => setBlockType(editor, () => $createHeadingNode("h2")),
		},
		{
			label: t("field.richtext.heading3"),
			keywords: ["h3", "heading"],
			icon: <Heading3 size={ICON_SIZE} />,
			action: () => setBlockType(editor, () => $createHeadingNode("h3")),
		},
		{
			label: t("field.richtext.bullet_list"),
			keywords: ["bullet", "ul", "unordered", "list"],
			icon: <List size={ICON_SIZE} />,
			action: () => editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined),
		},
		{
			label: t("field.richtext.ordered_list"),
			keywords: ["ordered", "ol", "number", "list"],
			icon: <ListOrdered size={ICON_SIZE} />,
			action: () => editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined),
		},
		{
			label: t("field.richtext.code_block"),
			keywords: ["code", "pre", "snippet"],
			icon: <Code size={ICON_SIZE} />,
			action: () => setBlockType(editor, () => $createCodeNode()),
		},
		{
			label: t("field.richtext.quote"),
			keywords: ["quote", "blockquote"],
			icon: <Quote size={ICON_SIZE} />,
			action: () => setBlockType(editor, () => $createQuoteNode()),
		},
	];
}

function embedCommands(ctrl: EmbedController | null, t: Translate): SlashCommand[] {
	if (!ctrl || ctrl.disabled) {
		return [];
	}
	return ctrl.defs.map((def) => ({
		label: def.label,
		keywords: [def.kind.toLowerCase(), def.label.toLowerCase()],
		icon: def.icon ? <NodeIcon icon={{ name: def.icon }} /> : <Box size={ICON_SIZE} />,
		action: () => ctrl.requestInsert(def),
		group: t("field.richtext.embeds_group"),
	}));
}

export function useSlashCommands(editor: LexicalEditor, query: string): SlashCommand[] {
	const t = useTranslation();
	const embeds = useEmbedController();

	const commands = useMemo(
		() => [...buildCommands(editor, t), ...embedCommands(embeds, t)],
		[editor, t, embeds],
	);

	return useMemo(() => {
		if (!query) {
			return commands;
		}
		const q = query.toLowerCase();
		return commands.filter(
			(cmd) => cmd.label.toLowerCase().includes(q) || cmd.keywords.some((k) => k.includes(q)),
		);
	}, [commands, query]);
}
