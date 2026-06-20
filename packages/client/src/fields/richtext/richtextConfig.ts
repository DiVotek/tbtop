import { CodeHighlightNode, CodeNode } from "@lexical/code";
import { AutoLinkNode, LinkNode } from "@lexical/link";
import { ListItemNode, ListNode } from "@lexical/list";
import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import type { Klass, LexicalNode } from "lexical";

// Shared node set + theme for both the editor (form) and the read-only view.
// Keeping one list avoids the editor and view drifting on which nodes they
// know how to serialize/render.

export const RICHTEXT_NODES: Array<Klass<LexicalNode>> = [
	HeadingNode,
	QuoteNode,
	ListNode,
	ListItemNode,
	CodeNode,
	CodeHighlightNode,
	LinkNode,
	AutoLinkNode,
];

export const RICHTEXT_THEME = {
	root: "tabletop-editor",
	paragraph: "",
	heading: { h1: "", h2: "", h3: "" },
	list: { ul: "", ol: "", listitem: "" },
	quote: "",
	code: "",
	link: "",
	text: {
		bold: "font-bold",
		italic: "italic",
		underline: "underline",
		strikethrough: "line-through",
		code: "",
	},
};
