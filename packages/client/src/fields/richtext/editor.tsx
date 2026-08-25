import "./lexicalCore";
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
import type { EditorState, SerializedEditorState } from "lexical";
import { useMemo, useRef } from "react";
import { useTranslation } from "../../i18n/i18n";
import { RICHTEXT_NODES, RICHTEXT_THEME } from "./richtextConfig";
import { resolveInitialEditorState } from "./richtextInitialState";
import { SlashMenuPlugin } from "./slashMenuPlugin";
import { Toolbar } from "./toolbar";

interface RichtextEditorProps {
	initialState: SerializedEditorState | string | null;
	placeholder?: string;
	disabled?: boolean;
	onChange: (state: SerializedEditorState) => void;
}

export function RichtextEditor({
	initialState,
	placeholder,
	disabled,
	onChange,
}: RichtextEditorProps) {
	const t = useTranslation();
	const mountState = useRef(initialState);

	const initialConfig = useMemo(
		() => ({
			namespace: "TabletopRichtextEditor",
			editable: !disabled,
			nodes: RICHTEXT_NODES,
			theme: RICHTEXT_THEME,
			editorState: resolveInitialEditorState(mountState.current),
			onError: (error: Error) => {
				console.error("Lexical error:", error);
			},
		}),
		[disabled],
	);

	return (
		<LexicalComposer initialConfig={initialConfig}>
			<div className="relative rounded-md border transition-[color,box-shadow] focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/50">
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
					onChange={(state: EditorState) => onChange(state.toJSON())}
					ignoreSelectionChange
					ignoreHistoryMergeTagChange
				/>
				<SlashMenuPlugin />
			</div>
		</LexicalComposer>
	);
}
