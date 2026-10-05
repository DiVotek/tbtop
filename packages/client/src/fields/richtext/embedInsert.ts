import "./lexicalCore";
import {
	$createParagraphNode,
	$getNodeByKey,
	$getRoot,
	$getSelection,
	$isNodeSelection,
	$isParagraphNode,
	$isRangeSelection,
	type LexicalNode,
	type NodeKey,
} from "lexical";
import type { EmbedNode } from "./embedNode";

/** The top-level block holding the cursor when insertion was requested; null = append. */
export type InsertTarget = { key: NodeKey } | null;

/** Read while the selection still points where the user asked to insert (before a modal opens). */
export function $captureInsertTarget(): InsertTarget {
	const selection = $getSelection();
	let node: LexicalNode | undefined;
	if ($isRangeSelection(selection)) {
		node = selection.anchor.getNode();
	} else if ($isNodeSelection(selection)) {
		node = selection.getNodes()[0];
	}
	const top = node?.getTopLevelElement() ?? null;
	return top ? { key: top.getKey() } : null;
}

/**
 * An empty root paragraph is replaced; any other block gets the card after it;
 * no target (or a target gone meanwhile) appends. A paragraph always follows the card.
 */
export function $insertEmbedAt(target: InsertTarget, embed: EmbedNode): void {
	const top = target ? $getNodeByKey(target.key) : null;
	if (!top?.isAttached()) {
		$getRoot().append(embed);
	} else if ($isParagraphNode(top) && top.getTextContentSize() === 0) {
		top.replace(embed);
	} else {
		top.insertAfter(embed);
	}
	if (embed.getNextSibling() === null) {
		embed.insertAfter($createParagraphNode());
	}
	embed.selectNext(0, 0);
}
