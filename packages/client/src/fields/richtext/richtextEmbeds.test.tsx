import { describe, expect, it } from "bun:test";
import "./lexicalCore";
import { act, render, waitFor } from "@testing-library/react";
import { $getRoot, type LexicalEditor, type SerializedEditorState } from "lexical";
import { $createEmbedNode } from "./embedNode";
import { RichtextForm, type RichtextValue } from "./richtextField";

const EMPTY_PARAGRAPH = {
	children: [],
	direction: null,
	format: "",
	indent: 0,
	type: "paragraph",
	version: 1,
	textFormat: 0,
	textStyle: "",
};

function documentOf(children: unknown[]): SerializedEditorState {
	const doc = {
		root: { children, direction: null, format: "", indent: 0, type: "root", version: 1 },
	};
	// The fixture is hand-built JSON; Lexical types only the root's generic node shape.
	const state = doc as unknown as SerializedEditorState;
	return state;
}

async function mountedEditor(container: HTMLElement): Promise<LexicalEditor> {
	let editor: LexicalEditor | undefined;
	await waitFor(() => {
		const root = container.querySelector<HTMLElement>("[contenteditable]");
		// Lexical attaches its editor to the root element it controls.
		const attached = root as (HTMLElement & { __lexicalEditor?: LexicalEditor }) | null;
		editor = attached?.__lexicalEditor;
		expect(editor).toBeDefined();
	});
	if (!editor) {
		throw new Error("editor did not mount");
	}
	return editor;
}

describe("richtext embeds", () => {
	it("keeps a document holding only an embed instead of emitting null", async () => {
		const emitted: Array<RichtextValue | null> = [];
		const { container } = render(
			<RichtextForm
				name="body"
				value={documentOf([EMPTY_PARAGRAPH])}
				onChange={(next) => emitted.push(next)}
			/>,
		);
		const editor = await mountedEditor(container);

		act(() => {
			editor.update(
				() => {
					$getRoot()
						.clear()
						.append($createEmbedNode("e1", "callout", { title: "Hi" }));
				},
				{ discrete: true },
			);
		});

		await waitFor(() => expect(emitted.length).toBeGreaterThan(0));
		const last = emitted.at(-1);
		expect(last).not.toBeNull();
		expect(JSON.stringify(last)).toContain('"type":"embed"');
	});

	it("round-trips an embed of an unknown kind on a field without embeds", async () => {
		const legacy = {
			type: "embed",
			version: 1,
			id: "0b8a3c9e-0d4f-4a57-9c1e-2f7a6b5d4e3c",
			kind: "legacy",
			data: { title: "Kept", nested: { list: [1, 2], empty: null } },
		};
		const emptyData = { ...legacy, id: "4f1d2e3c-5b6a-4c7d-8e9f-0a1b2c3d4e5f", data: [] };
		const { container } = render(
			<RichtextForm
				name="body"
				value={documentOf([legacy, emptyData, EMPTY_PARAGRAPH])}
				onChange={() => {}}
			/>,
		);
		const editor = await mountedEditor(container);

		const children = editor.getEditorState().toJSON().root.children;
		expect(children.slice(0, 2)).toEqual([legacy, emptyData]);
	});
});
