interface LexicalLike {
	type?: string;
	text?: string;
	kind?: unknown;
	children?: unknown[];
}

/** How an embed reads in a preview; absent = embeds contribute no text. */
type EmbedText = (kind: string) => string;

const BLOCK_TYPES = new Set(["code", "embed", "heading", "list", "listitem", "paragraph", "quote"]);

/** The document's own text; embeds contribute none. */
export function lexicalToPlainText(value: unknown): string {
	return readRoot(value, undefined);
}

/** The text a table cell shows: an embed reads as `[<label or kind>]`. */
export function lexicalToPreviewText(value: unknown, labels: Record<string, string> = {}): string {
	return readRoot(value, (kind) => `[${labels[kind] ?? kind}]`);
}

/** True when the document holds at least one embed node, at any depth. */
export function hasEmbedNode(value: unknown): boolean {
	const root = rootOf(value);
	return root !== undefined && containsEmbed(root);
}

function isLexicalLike(value: unknown): value is LexicalLike {
	return typeof value === "object" && value !== null;
}

function rootOf(value: unknown): LexicalLike | undefined {
	if (!isLexicalLike(value) || !("root" in value) || !isLexicalLike(value.root)) {
		return undefined;
	}
	return value.root;
}

function readRoot(value: unknown, embedText: EmbedText | undefined): string {
	const root = rootOf(value);
	return root ? readNode(root, embedText).trim() : "";
}

function containsEmbed(node: LexicalLike): boolean {
	if (node.type === "embed") {
		return true;
	}
	return (node.children ?? []).some((child) => isLexicalLike(child) && containsEmbed(child));
}

function readNode(node: LexicalLike, embedText: EmbedText | undefined): string {
	if (typeof node.text === "string") {
		return node.text;
	}
	if (node.type === "embed") {
		return embedText && typeof node.kind === "string" ? embedText(node.kind) : "";
	}
	if (!Array.isArray(node.children)) {
		return "";
	}
	return node.children.reduce<string>((text, child) => {
		if (!isLexicalLike(child)) {
			return text;
		}
		const childText = readNode(child, embedText);
		const needsSeparator =
			text.length > 0 &&
			childText.length > 0 &&
			BLOCK_TYPES.has(child.type ?? "") &&
			!text.endsWith(" ") &&
			!childText.startsWith(" ");
		return text + (needsSeparator ? " " : "") + childText;
	}, "");
}
