import { getBlockDescriptor } from "../render/blockRegistry";
import { structureChildren } from "../structure/structureChildren";
import type { StructureNode } from "../structure/types";
import type { FieldConstraints } from "./constraints";

type Bag = Record<string, unknown>;

interface Scope {
	defaultLocale: string;
	/** `items.*.` while inside a repeater's rows, "" at the form root. */
	prefix: string;
}

/**
 * Walks a form's structure collecting wire constraints into a flat map keyed
 * the way the server's RuleWalker keys its rules, so client and server flag
 * the same paths: a translatable field is `name.{defaultLocale}`, a repeater
 * sub-field is `items.*.name` (the `*` is expanded per row at parse time by
 * compileConstraints). Sub-fields of a translatable repeater are skipped —
 * its value is a locale map of rows and the server collects no rules for them
 * either. The create mini-form of a select is a separate form and stays out.
 */
export function collectConstraints(
	node: StructureNode,
	defaultLocale = "en",
): Record<string, FieldConstraints> {
	const acc: Record<string, FieldConstraints> = {};
	collectInto(node, acc, { defaultLocale, prefix: "" });
	return acc;
}

function collectInto(
	node: StructureNode,
	acc: Record<string, FieldConstraints>,
	scope: Scope,
): void {
	const opts = node.options as Bag;
	if (!isNamedField(node)) {
		collectChildren(opts, acc, scope);
		return;
	}
	const isTranslatable = opts.translatable === true;
	if (opts.constraints) {
		acc[fieldKey(node.name, isTranslatable, scope)] = opts.constraints as FieldConstraints;
	}
	if (isTranslatable) {
		return;
	}
	collectChildren(opts, acc, { ...scope, prefix: `${scope.prefix}${node.name}.*.` });
}

function collectChildren(opts: Bag, acc: Record<string, FieldConstraints>, scope: Scope): void {
	for (const child of structureChildren(opts)) {
		collectInto(child, acc, scope);
	}
}

function fieldKey(name: string, isTranslatable: boolean, scope: Scope): string {
	const key = `${scope.prefix}${name}`;
	return isTranslatable ? `${key}.${scope.defaultLocale}` : key;
}

/** Field vs layout comes from the registry: a named tabs node (URL state) is not a field. */
function isNamedField(node: StructureNode): node is StructureNode & { name: string } {
	return getBlockDescriptor(node.kind)?.behavior === "field" && node.name !== undefined;
}
