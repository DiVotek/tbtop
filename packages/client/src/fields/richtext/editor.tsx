import { CodeHighlightNode, CodeNode } from "@lexical/code";
import { AutoLinkNode, LinkNode } from "@lexical/link";
import { ListItemNode, ListNode } from "@lexical/list";
import { TRANSFORMERS } from "@lexical/markdown";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { LinkPlugin } from "@lexical/react/LexicalLinkPlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { MarkdownShortcutPlugin } from "@lexical/react/LexicalMarkdownShortcutPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import type { EditorState, SerializedEditorState } from "lexical";
import { useCallback, useMemo, useRef } from "react";
import { useTranslation } from "../../i18n/i18n";
import { SlashMenuPlugin } from "./slashMenuPlugin";
import { Toolbar } from "./toolbar";

interface RichtextEditorProps {
	initialState: SerializedEditorState | string | null;
	placeholder?: string;
	disabled?: boolean;
	onChange: (state: SerializedEditorState) => void;
}

const NODES = [
	HeadingNode,
	QuoteNode,
	ListNode,
	ListItemNode,
	CodeNode,
	CodeHighlightNode,
	LinkNode,
	AutoLinkNode,
];

const DEBOUNCE_MS = 300;

function resolveInitialEditorState(
	value: SerializedEditorState | string | null,
): string | undefined {
	if (!value) return undefined;
	// Plain string: wrap as a single paragraph node so the editor shows the
	// text instead of crashing on legacy data.
	if (typeof value === "string") {
		const escaped = value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
		return JSON.stringify({
			root: {
				children: [
					{
						children: [
							{
								detail: 0,
								format: 0,
								mode: "normal",
								style: "",
								text: escaped,
								type: "text",
								version: 1,
							},
						],
						direction: "ltr",
						format: "",
						indent: 0,
						type: "paragraph",
						version: 1,
					},
				],
				direction: "ltr",
				format: "",
				indent: 0,
				type: "root",
				version: 1,
			},
		});
	}
	return JSON.stringify(value);
}

export function RichtextEditor({
	initialState,
	placeholder,
	disabled,
	onChange,
}: RichtextEditorProps) {
	const t = useTranslation();
	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const mountState = useRef(initialState);

	const debouncedOnChange = useCallback(
		(state: SerializedEditorState) => {
			if (debounceRef.current) {
				clearTimeout(debounceRef.current);
			}
			debounceRef.current = setTimeout(() => onChange(state), DEBOUNCE_MS);
		},
		[onChange],
	);

	const initialConfig = useMemo(
		() => ({
			namespace: "TabletopRichtextEditor",
			editable: !disabled,
			nodes: NODES,
			theme: {
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
			},
			editorState: resolveInitialEditorState(mountState.current),
			onError: (error: Error) => {
				console.error("Lexical error:", error);
			},
		}),
		[],
	);

	return (
		<LexicalComposer initialConfig={initialConfig}>
			<div className="relative rounded-md border">
				<Toolbar />
				<div className="relative">
					<RichTextPlugin
						contentEditable={<ContentEditable />}
						placeholder={
							<div className="tabletop-editor-placeholder">
								{placeholder ?? t("field.richtext.placeholder")}
							</div>
						}
						ErrorBoundary={LexicalErrorBoundary}
					/>
				</div>
				<HistoryPlugin />
				<ListPlugin />
				<LinkPlugin />
				<MarkdownShortcutPlugin transformers={TRANSFORMERS} />
				{/* Both ignore-flags keep mount-time updates (history-merge,
				    selection) from writing back and falsely dirtying the form. */}
				<OnChangePlugin
					onChange={(state: EditorState) => debouncedOnChange(state.toJSON())}
					ignoreSelectionChange
					ignoreHistoryMergeTagChange
				/>
				<SlashMenuPlugin />
			</div>
		</LexicalComposer>
	);
}
