import "./lexicalCore";
import {
	DecoratorNode,
	type LexicalNode,
	type NodeKey,
	type SerializedLexicalNode,
	type Spread,
} from "lexical";
import type { ReactNode } from "react";
import { EmbedCard } from "./embedCard";

/** Stored in hosts' databases — the shape is frozen. */
export type SerializedEmbedNode = Spread<
	{ type: "embed"; version: 1; id: string; kind: string; data: unknown },
	SerializedLexicalNode
>;

type EmbedContent = Pick<SerializedEmbedNode, "id" | "kind" | "data">;

/**
 * A block-level card holding one embed. Registered on every richtext editor and
 * view, so a stored embed of any kind loads and serializes back unchanged.
 */
export class EmbedNode extends DecoratorNode<ReactNode> {
	__id: string;
	__kind: string;
	__data: unknown;

	static override getType(): string {
		return "embed";
	}

	static override clone(node: EmbedNode): EmbedNode {
		return new EmbedNode({ id: node.__id, kind: node.__kind, data: node.__data }, node.__key);
	}

	static override importJSON(serialized: SerializedEmbedNode): EmbedNode {
		return new EmbedNode(serialized);
	}

	constructor({ id, kind, data }: EmbedContent, key?: NodeKey) {
		super(key);
		this.__id = id;
		this.__kind = kind;
		this.__data = data;
	}

	override exportJSON(): SerializedEmbedNode {
		return { type: "embed", version: 1, id: this.__id, kind: this.__kind, data: this.__data };
	}

	override createDOM(): HTMLElement {
		const el = document.createElement("div");
		el.className = "tabletop-editor-embed";
		return el;
	}

	override updateDOM(): false {
		return false;
	}

	override isInline(): false {
		return false;
	}

	getKind(): string {
		return this.getLatest().__kind;
	}

	getData(): unknown {
		return this.getLatest().__data;
	}

	setData(data: unknown): this {
		const writable = this.getWritable();
		writable.__data = data;
		return writable;
	}

	setId(id: string): this {
		const writable = this.getWritable();
		writable.__id = id;
		return writable;
	}

	override decorate(): ReactNode {
		return <EmbedCard nodeKey={this.getKey()} kind={this.__kind} data={this.__data} />;
	}
}

export function $createEmbedNode(id: string, kind: string, data: unknown): EmbedNode {
	return new EmbedNode({ id, kind, data });
}

export function $isEmbedNode(node: LexicalNode | null | undefined): node is EmbedNode {
	return node instanceof EmbedNode;
}
