import { Node } from "../node";

interface TranslatableField {
	isTranslatableOptedOut(): boolean;
	isTranslatableField(): boolean;
	translatable(value?: boolean): unknown;
}

function isField(child: unknown): child is TranslatableField {
	const f = child as Partial<TranslatableField> | null;
	return typeof f?.isTranslatableField === "function" && typeof f.translatable === "function";
}

/** Cascades ->translatable() onto every field below, skipping explicit opt-outs (S::cascadeTranslatable). */
export function cascadeTranslatable(children: unknown[]): unknown[] {
	return children.map((child) => {
		if (isField(child) && !child.isTranslatableOptedOut() && !child.isTranslatableField()) {
			child.translatable();
			return child;
		}
		return child instanceof Node ? translatableNode(child) : child;
	});
}

/** Node::translatable(): a copy whose child lists and tab bodies cascade. */
export function translatableNode(node: Node): Node {
	const options = { ...node.options };
	for (const key of ["children", "fields"]) {
		if (Array.isArray(options[key])) {
			options[key] = cascadeTranslatable(options[key] as unknown[]);
		}
	}
	if (Array.isArray(options.tabs)) {
		options.tabs = (options.tabs as Record<string, unknown>[]).map((tab) =>
			tab.body === undefined ? tab : { ...tab, body: cascadeTranslatable([tab.body])[0] },
		);
	}
	return node.withOptions(options);
}
