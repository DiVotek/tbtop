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
import { useCallback, useMemo, useRef } from "react";
import { useTranslation } from "../../i18n/i18n";
import { RICHTEXT_NODES, RICHTEXT_THEME } from "./richtextConfig";
import { SlashMenuPlugin } from "./slashMenuPlugin";
import { Toolbar } from "./toolbar";

interface RichtextEditorProps {
	initialState: SerializedEditorState | string | null;
	placeholder?: string;
	disabled?: boolean;
	onChange: (state: SerializedEditorState) => void;
}

const DEBOUNCE_MS = 300;

// Resolve a stored Lexical state (or legacy plain string) into the JSON string
// LexicalComposer's `editorState` expects. Shared by the read-only view.
export function resolveInitialEditorState(
	value: SerializedEditorState | string | null,
): string | undefined {
	if (!value) {
		return undefined;
	}
	// Plain string: wrap as a single paragraph node so the editor shows the
	// text instead of crashing on legacy data.
	if (typeof value === "string") {
		const escaped = value.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
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
