/** Lexical documents and their `embed` nodes (EmbedsRule.php's walk). */
type Bag = Record<string, unknown>;

export interface EmbedNode {
	id: string;
	kind: string;
	data: Bag;
	version: 1;
}

const isBag = (v: unknown): v is Bag => v !== null && typeof v === "object" && !Array.isArray(v);

/** Every embed node in document order, with whether it sits at the root. */
export function embedNodes(document: unknown): [Bag, boolean][] {
	const root = isBag(document) ? document.root : null;
	return isBag(root) && Array.isArray(root.children) ? walk(root.children, true) : [];
}

function walk(children: unknown[], atRoot: boolean): [Bag, boolean][] {
	return children
		.filter(isBag)
		.flatMap((child): [Bag, boolean][] => [
			...(child.type === "embed" ? [[child, atRoot] as [Bag, boolean]] : []),
			...(Array.isArray(child.children) ? walk(child.children, false) : []),
		]);
}

export function isWellFormed(node: Bag): node is Bag & EmbedNode {
	return (
		typeof node.id === "string" &&
		node.id !== "" &&
		typeof node.kind === "string" &&
		node.kind !== "" &&
		isBag(node.data) &&
		node.version === 1
	);
}

/** Every document in a value: one (it has a `root`), or any nested list or map of them. */
function documentsIn(value: unknown): Bag[] {
	if (value === null || typeof value !== "object") {
		return [];
	}
	return isBag(value) && "root" in value ? [value] : Object.values(value).flatMap(documentsIn);
}

/** Every value stored under `field` at any depth of the records (repeater rows, locales). */
function valuesUnder(value: unknown, field: string): unknown[] {
	if (value === null || typeof value !== "object") {
		return [];
	}
	return Object.entries(value).flatMap(([key, child]) =>
		key === field ? [child] : valuesUnder(child, field),
	);
}

/** Per kind, the data of the embeds the records already store under `field`. */
export function storedEmbedData(records: unknown[], field: string): Record<string, Bag[]> {
	const out: Record<string, Bag[]> = {};
	const nodes = valuesUnder(records, field)
		.flatMap(documentsIn)
		.flatMap((document) => embedNodes(document).map(([node]) => node));
	for (const node of nodes) {
		if (typeof node.kind === "string" && isBag(node.data)) {
			(out[node.kind] ??= []).push(node.data);
		}
	}
	return out;
}
