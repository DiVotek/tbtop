import "./lexicalCore";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
	$createNodeSelection,
	$getNodeByKey,
	$isElementNode,
	$setSelection,
	COMMAND_PRIORITY_HIGH,
	type LexicalNode,
	type NodeKey,
	SELECTION_INSERT_CLIPBOARD_NODES_COMMAND,
} from "lexical";
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { safeUuid } from "../../lib/safeUuid";
import { asBag, type EmbedController, EmbedCtx, type EmbedDef } from "./embedContext";
import { $captureInsertTarget, $insertEmbedAt, type InsertTarget } from "./embedInsert";
import { EmbedModal, embedDefaults } from "./embedModal";
import { $createEmbedNode, $isEmbedNode } from "./embedNode";

type Bag = Record<string, unknown>;

type ModalState =
	| { mode: "insert"; def: EmbedDef; initial: Bag; target: InsertTarget }
	| { mode: "edit"; def: EmbedDef; initial: Bag; nodeKey: NodeKey };

/** Where the keyboard lands once the modal closes: the edited card, or the caret after a new one. */
type AfterClose = { select: "card" | "after"; key: NodeKey } | null;

interface EmbedsPluginProps {
	defs: EmbedDef[];
	disabled: boolean;
	children: ReactNode;
}

/** Owns the embed modal and the paste rule; cards, toolbar and slash menu reach it via context. */
export function EmbedsPlugin({ defs, disabled, children }: EmbedsPluginProps) {
	const [editor] = useLexicalComposerContext();
	const [modal, setModal] = useState<ModalState | null>(null);
	const afterClose = useRef<AfterClose>(null);

	useEffect(
		() =>
			editor.registerCommand(
				SELECTION_INSERT_CLIPBOARD_NODES_COMMAND,
				({ nodes }) => {
					$preparePastedEmbeds(nodes, new Set(defs.map((d) => d.kind)));
					return false;
				},
				COMMAND_PRIORITY_HIGH,
			),
		[editor, defs],
	);

	const requestInsert = useCallback(
		(def: EmbedDef) => {
			const target = editor.getEditorState().read($captureInsertTarget);
			if (def.fields.length > 0) {
				afterClose.current = null;
				setModal({ mode: "insert", def, initial: embedDefaults(def.fields), target });
				return;
			}
			editor.update(() => $insertEmbedAt(target, $createEmbedNode(safeUuid(), def.kind, {})));
		},
		[editor],
	);

	const requestEdit = useCallback(
		(nodeKey: NodeKey) => {
			const found = editor.getEditorState().read(() => {
				const node = $getNodeByKey(nodeKey);
				return $isEmbedNode(node) ? { kind: node.getKind(), data: node.getData() } : null;
			});
			const def = found ? defs.find((d) => d.kind === found.kind) : undefined;
			if (!(found && def)) {
				return;
			}
			afterClose.current = { select: "card", key: nodeKey };
			setModal({ mode: "edit", def, initial: asBag(found.data), nodeKey });
		},
		[editor, defs],
	);

	const onApplied = useCallback(
		(data: Bag) => {
			if (!modal) {
				return;
			}
			editor.update(() => {
				if (modal.mode === "insert") {
					const embed = $createEmbedNode(safeUuid(), modal.def.kind, data);
					$insertEmbedAt(modal.target, embed);
					afterClose.current = { select: "after", key: embed.getKey() };
					return;
				}
				const node = $getNodeByKey(modal.nodeKey);
				if ($isEmbedNode(node)) {
					node.setData(data);
				}
			});
		},
		[editor, modal],
	);

	const onClose = useCallback(() => {
		setModal(null);
		const target = afterClose.current;
		afterClose.current = null;
		// The dialog hands focus to <body> as it unmounts and the editor drops its
		// selection; queued after that, this gives both back to the editor.
		setTimeout(() => {
			editor.getRootElement()?.focus({ preventScroll: true });
			if (target) {
				editor.update(() => $selectAfterClose(target));
			}
		}, 0);
	}, [editor]);

	const ctrl = useMemo<EmbedController>(
		() => ({ defs, disabled, requestInsert, requestEdit }),
		[defs, disabled, requestInsert, requestEdit],
	);

	return (
		<EmbedCtx.Provider value={ctrl}>
			{children}
			{modal && (
				<EmbedModal
					def={modal.def}
					initial={modal.initial}
					onApplied={onApplied}
					onClose={onClose}
				/>
			)}
		</EmbedCtx.Provider>
	);
}

function $selectAfterClose({ select, key }: NonNullable<AfterClose>): void {
	const node = $getNodeByKey(key);
	if (!node?.isAttached()) {
		return;
	}
	if (select === "after") {
		node.selectNext(0, 0);
		return;
	}
	const selection = $createNodeSelection();
	selection.add(key);
	$setSelection(selection);
}

/**
 * A pasted embed gets a fresh id (the copy must not share one with its source);
 * one whose kind this field does not declare is dropped without a word.
 */
function $preparePastedEmbeds(nodes: LexicalNode[], kinds: Set<string>): void {
	for (let i = nodes.length - 1; i >= 0; i--) {
		const node = nodes[i];
		if ($isEmbedNode(node) && !kinds.has(node.getKind())) {
			nodes.splice(i, 1);
		} else if ($isEmbedNode(node)) {
			node.setId(safeUuid());
		} else if ($isElementNode(node)) {
			$dropNestedEmbeds(node.getChildren());
		}
	}
}

/** Embeds live only at the root, so one nested inside pasted content is dropped. */
function $dropNestedEmbeds(children: LexicalNode[]): void {
	for (const child of children) {
		if ($isEmbedNode(child)) {
			child.remove();
		} else if ($isElementNode(child)) {
			$dropNestedEmbeds(child.getChildren());
		}
	}
}
