import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import type { SerializedEditorState } from "lexical";
import { resolveInitialEditorState } from "./editor";
import { RICHTEXT_NODES, RICHTEXT_THEME } from "./richtextConfig";

interface RichtextViewProps {
	state: SerializedEditorState | string;
}

// Read-only Lexical render: same nodes + theme as the editor, but editable
// false and no toolbar / history / onChange plugins. A frozen composer is the
// simplest way to render arbitrary Lexical node trees without a serializer.
export function RichtextView({ state }: RichtextViewProps) {
	const initialConfig = {
		namespace: "TabletopRichtextView",
		editable: false,
		nodes: RICHTEXT_NODES,
		theme: RICHTEXT_THEME,
		editorState: resolveInitialEditorState(state),
		onError: (error: Error) => {
			console.error("Lexical view error:", error);
		},
	};

	return (
		<LexicalComposer initialConfig={initialConfig}>
			<RichTextPlugin
				contentEditable={<ContentEditable className="tabletop-editor" />}
				placeholder={null}
				ErrorBoundary={LexicalErrorBoundary}
			/>
		</LexicalComposer>
	);
}
