import { AgentError } from "./answer";

const ELEMENT = ["children", "format", "indent", "direction"];
const TEXT = ["text", "format", "detail", "mode", "style"];

/** Node types the editor registers, with the keys Lexical reads on import (RichtextDocument.php). */
const NODES: Record<string, string[]> = {
	paragraph: ELEMENT,
	text: TEXT,
	linebreak: [],
	tab: TEXT,
	heading: [...ELEMENT, "tag"],
	quote: ELEMENT,
	list: [...ELEMENT, "listType", "start"],
	listitem: [...ELEMENT, "value"],
	code: ELEMENT,
	"code-highlight": TEXT,
	link: [...ELEMENT, "url"],
	autolink: [...ELEMENT, "url"],
	embed: ["id", "kind", "data", "version"],
};

export const RICHTEXT_NODE_TYPES = Object.keys(NODES);

type LexicalNode = Record<string, unknown>;

const isObject = (value: unknown): value is LexicalNode =>
	value !== null && typeof value === "object" && !Array.isArray(value);

/**
 * An agent-written editor state, checked before the handler stores it: the
 * editor drops unknown nodes and fails on missing keys, so such a document
 * would save but not open. null is an empty editor.
 */
export function assertRichtextDocument(key: string, value: unknown): void {
	if (value === null || value === undefined) {
		return;
	}
	const root = isObject(value) ? value.root : undefined;
	if (!isObject(root) || root.type !== "root") {
		throw new AgentError(`${key}: richtext must be a Lexical editor state {root: {...}}.`);
	}
	assertNode(key, root, { path: "root", needs: ELEMENT });
}

function assertNode(key: string, node: LexicalNode, at: { path: string; needs: string[] }): void {
	const type = String(node.type);
	for (const need of at.needs) {
		if (!(need in node) || (need === "children" && !Array.isArray(node[need]))) {
			throw new AgentError(`${key}: richtext node "${type}" at ${at.path} needs ${need}.`);
		}
	}
	const children = Array.isArray(node.children) ? node.children : [];
	for (const [i, child] of children.entries()) {
		const path = `${at.path}.children[${i}]`;
		const childType = isObject(child) ? child.type : undefined;
		if (typeof childType !== "string") {
			throw new AgentError(`${key}: richtext node at ${path} needs type.`);
		}
		const needs = NODES[childType];
		if (needs === undefined) {
			const allowed = RICHTEXT_NODE_TYPES.join(", ");
			throw new AgentError(
				`${key}: unknown richtext node "${childType}" at ${path}; allowed: ${allowed}.`,
			);
		}
		assertNode(key, child as LexicalNode, { path, needs });
	}
}
