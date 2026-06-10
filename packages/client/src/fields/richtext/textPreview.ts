interface LexicalLike {
	text?: string;
	children?: unknown[];
}

export function lexicalToPlainText(value: unknown): string {
	if (!value || typeof value !== "object") {
		return "";
	}
	const root = (value as { root?: LexicalLike }).root;
	if (!root) {
		return "";
	}
	return readNode(root).trim();
}

function readNode(node: LexicalLike): string {
	if (typeof node.text === "string") {
		return node.text;
	}
	if (!Array.isArray(node.children)) {
		return "";
	}
	return node.children.map((c) => readNode(c as LexicalLike)).join(" ");
}
