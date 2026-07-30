import { describe, expect, test } from "bun:test";
// Must import first: Bun's ESM linker TDZ-crashes subclasses in
// @lexical/link|list|code|rich-text if `lexical`/@lexical/utils haven't
// finished evaluating yet (pre-existing cross-package circular-init hazard).
import "lexical";
import "@lexical/utils";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { LinkPlugin } from "@lexical/react/LexicalLinkPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { render, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
	$createTextNode,
	$getRoot,
	$isElementNode,
	type EditorState,
	type SerializedEditorState,
} from "lexical";
import { useEffect, useRef } from "react";
import { RICHTEXT_NODES, RICHTEXT_THEME } from "./richtextConfig";
import { Toolbar } from "./toolbar";

interface SerializedTreeNode {
	type: string;
	url?: string;
	text?: string;
	children?: SerializedTreeNode[];
}

function findLinkNode(node: SerializedTreeNode): SerializedTreeNode | null {
	if (node.type === "link") {
		return node;
	}
	for (const child of node.children ?? []) {
		const found = findLinkNode(child);
		if (found) {
			return found;
		}
	}
	return null;
}

function textOf(node: SerializedTreeNode): string {
	if (node.type === "text") {
		return node.text ?? "";
	}
	return (node.children ?? []).map(textOf).join("");
}

// Lexical's SerializedEditorState only types `root` down to the generic
// SerializedLexicalNode shape; this walker needs the full recursive
// children/text/url tree that the actual JSON carries at runtime.
function rootOf(state: SerializedEditorState): SerializedTreeNode {
	const treeShaped = state.root as unknown as SerializedTreeNode;
	return treeShaped;
}

// Seeds a single paragraph with plain text on mount and selects it
// immediately, so the toolbar's Link button opens against a real,
// non-collapsed selection — as if a user had just selected the text.
function SeedAndSelectText({ text }: { text: string }) {
	const [editor] = useLexicalComposerContext();
	const didSeed = useRef(false);

	useEffect(() => {
		if (didSeed.current) {
			return;
		}
		didSeed.current = true;
		editor.update(() => {
			const paragraph = $getRoot().getFirstChild();
			if (!paragraph || !$isElementNode(paragraph)) {
				return;
			}
			const textNode = $createTextNode(text);
			paragraph.append(textNode);
			textNode.select(0, text.length);
		});
	}, [editor, text]);

	return null;
}

// Boxes the latest onChange payload. A plain `let` loses its narrowing once
// captured across the async waitFor/callback boundary below.
interface StateBox {
	current: SerializedEditorState | null;
}

function renderEditor(initialText: string, onChange: (state: SerializedEditorState) => void) {
	return render(
		<LexicalComposer
			initialConfig={{
				namespace: "test",
				nodes: RICHTEXT_NODES,
				theme: RICHTEXT_THEME,
				onError: (e) => {
					throw e;
				},
			}}
		>
			<Toolbar />
			<RichTextPlugin
				contentEditable={<ContentEditable />}
				placeholder={null}
				ErrorBoundary={LexicalErrorBoundary}
			/>
			<LinkPlugin />
			<OnChangePlugin
				onChange={(state: EditorState) => onChange(state.toJSON())}
				ignoreSelectionChange
			/>
			<SeedAndSelectText text={initialText} />
		</LexicalComposer>,
	);
}

describe("Toolbar link dialog", () => {
	test("applying a URL wraps the selected text in a link that survives serialization", async () => {
		const user = userEvent.setup();
		const box: StateBox = { current: null };
		const { container } = renderEditor("Hello world", (state) => {
			box.current = state;
		});

		await user.click(within(container).getByRole("button", { name: "Link" }));
		const dialog = within(container.ownerDocument.body);
		await user.type(await waitFor(() => dialog.getByLabelText("URL")), "https://example.com");
		await user.click(dialog.getByTestId("link-dialog-apply"));

		await waitFor(() => expect(box.current).not.toBeNull());
		const link = box.current && findLinkNode(rootOf(box.current));
		expect(link).not.toBeNull();
		expect(link?.url).toBe("https://example.com");
		expect(link && textOf(link)).toBe("Hello world");
	});

	test("remove-link dispatches null and strips the link node", async () => {
		const user = userEvent.setup();
		const box: StateBox = { current: null };
		const { container } = renderEditor("Hello world", (state) => {
			box.current = state;
		});

		const linkButton = within(container).getByRole("button", { name: "Link" });
		await user.click(linkButton);
		const dialog = within(container.ownerDocument.body);
		await user.type(await waitFor(() => dialog.getByLabelText("URL")), "https://example.com");
		await user.click(dialog.getByTestId("link-dialog-apply"));
		await waitFor(() => expect(box.current).not.toBeNull());

		await user.click(linkButton);
		const remove = await waitFor(() => dialog.getByTestId("link-dialog-remove"));
		await user.click(remove);

		await waitFor(() => {
			expect(box.current && findLinkNode(rootOf(box.current))).toBeNull();
		});
	});
});
