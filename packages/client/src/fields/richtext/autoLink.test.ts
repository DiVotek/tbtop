import "./lexicalCore";
import { describe, expect, test } from "bun:test";
import { $createCodeNode } from "@lexical/code";
import { $isAutoLinkNode, registerAutoLink } from "@lexical/link";
import {
	$createParagraphNode,
	$createTextNode,
	$getRoot,
	createEditor,
	type ElementNode,
	type LexicalEditor,
} from "lexical";
import { AUTO_LINK_EXCLUDED_PARENTS, AUTO_LINK_MATCHERS } from "./autoLink";
import { RICHTEXT_NODES } from "./richtextConfig";

function editorWithAutoLink(): LexicalEditor {
	const editor = createEditor({
		nodes: RICHTEXT_NODES,
		onError: (e) => {
			throw e;
		},
	});
	registerAutoLink(editor, {
		matchers: AUTO_LINK_MATCHERS,
		excludeParents: AUTO_LINK_EXCLUDED_PARENTS,
		changeHandlers: [],
	});
	return editor;
}

function linksAfterWriting(text: string, block: () => ElementNode = $createParagraphNode) {
	const editor = editorWithAutoLink();
	editor.update(
		() =>
			$getRoot()
				.clear()
				.append(block().append($createTextNode(text))),
		{
			discrete: true,
		},
	);
	return editor.getEditorState().read(() =>
		$getRoot()
			.getAllTextNodes()
			.map((node) => node.getParent())
			.filter($isAutoLinkNode)
			.map((link) => ({ url: link.getURL(), text: link.getTextContent() })),
	);
}

describe("richtext auto-link", () => {
	test("a typed URL becomes a link", () => {
		expect(linksAfterWriting("see https://example.com/docs?x=1 now")).toEqual([
			{ url: "https://example.com/docs?x=1", text: "https://example.com/docs?x=1" },
		]);
	});

	test("a bare www. address gets an https scheme", () => {
		expect(linksAfterWriting("go to www.example.com.")).toEqual([
			{ url: "https://www.example.com", text: "www.example.com" },
		]);
	});

	test("an email becomes a mailto link", () => {
		expect(linksAfterWriting("write to team@example.com today")).toEqual([
			{ url: "mailto:team@example.com", text: "team@example.com" },
		]);
	});

	test("plain words and a dangling scheme stay text", () => {
		expect(linksAfterWriting("no link here, just https:// and example")).toEqual([]);
	});

	test("a URL inside a code block stays text", () => {
		expect(linksAfterWriting("curl https://example.com", $createCodeNode)).toEqual([]);
	});
});
