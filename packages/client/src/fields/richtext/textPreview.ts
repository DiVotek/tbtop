interface LexicalLike {
	type?: string;
	text?: string;
	children?: unknown[];
}

const BLOCK_TYPES = new Set(["code", "heading", "list", "listitem", "paragraph", "quote"]);

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
	return node.children.reduce<string>((text, child) => {
		const childNode = child as LexicalLike;
		const childText = readNode(childNode);
		const needsSeparator =
			text.length > 0 &&
			childText.length > 0 &&
			BLOCK_TYPES.has(childNode.type ?? "") &&
			!text.endsWith(" ") &&
			!childText.startsWith(" ");
		return text + (needsSeparator ? " " : "") + childText;
	}, "");
}
