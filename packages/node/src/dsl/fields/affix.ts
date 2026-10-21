import { TextBlock } from "../blocks";
import { includes, Node } from "../node";
import { descendants } from "../walk";
import { Field } from "./field";

export type AffixContent = string | { toJSON(): unknown };

/**
 * A prefix()/suffix() argument as a display node (AffixNode.php): a string
 * becomes a TextBlock; a nested field throws, its rules would never be collected.
 */
export function affixNode(owner: string, key: string, content: AffixContent): unknown {
	const node = typeof content === "string" ? new TextBlock(content) : content;
	if (!includes(node)) {
		return null;
	}
	assertDisplayOnly(owner, key, [node]);
	return node;
}

function assertDisplayOnly(owner: string, key: string, nodes: unknown[]): void {
	for (const node of nodes) {
		if (node instanceof Field) {
			throw new TypeError(
				`${owner} ${key}() received field "${node.name}" — affixes may contain display nodes only.`,
			);
		}
		if (node instanceof Node) {
			assertDisplayOnly(owner, key, descendants(node));
		}
	}
}

interface AffixBag {
	name: string;
	opts: Record<string, unknown>;
}

/** Content rendered inside the control, before/after the input (HasAffixes.php). */
export class Affixes {
	/** Content before the input: a string or a display node. */
	prefix(content: AffixContent): this {
		return setAffix(this, "prefix", content);
	}

	/** Content after the input: a string or a display node. */
	suffix(content: AffixContent): this {
		return setAffix(this, "suffix", content);
	}
}

function setAffix<T extends object>(field: T, key: string, content: AffixContent): T {
	const bag = field as unknown as AffixBag;
	const node = affixNode(`Field "${bag.name}"`, key, content);
	if (node === null) {
		delete bag.opts[key];
	} else {
		bag.opts[key] = node;
	}
	return field;
}
