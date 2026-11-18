import { getBlockDescriptor } from "../render/blockRegistry";
import { structureChildren } from "../structure/structureChildren";
import type { StructureNode } from "../structure/types";

type Bag = Record<string, unknown>;

export function serializeFormData(data: Bag, formNode: StructureNode | undefined): Bag {
	if (!formNode) {
		return data;
	}
	return serializeScope(data, structureChildren(formNode.options as Bag));
}

/**
 * The form's secret() passwords (top level and layout containers, as the server
 * reads them). After a successful submit they go back to "left alone": the value
 * typed into one is stored now, and must not stay in the input.
 */
export function secretFieldNames(formNode: StructureNode | undefined): string[] {
	return formNode ? secretNamesIn(structureChildren(formNode.options as Bag)) : [];
}

function secretNamesIn(nodes: StructureNode[]): string[] {
	return nodes.flatMap((node) => {
		if (!node.name) {
			return secretNamesIn(structureChildren(node.options as Bag));
		}
		const secret = (node.options as Bag | undefined)?.secret;
		return node.kind === "password" && isBag(secret) ? [node.name] : [];
	});
}

function serializeScope(scope: Bag, nodes: StructureNode[]): Bag {
	let out = { ...scope };
	for (const node of nodes) {
		if (!node.name) {
			out = serializeScope(out, structureChildren(node.options as Bag));
			continue;
		}
		if (!(node.name in out)) {
			continue;
		}
		const value = serializeNodeValue(node, out[node.name]);
		// undefined means "not submitted" (a secret() password left alone): a FormData
		// body would otherwise send it as "", which the server reads as null.
		if (value === undefined) {
			delete out[node.name];
		} else {
			out[node.name] = value;
		}
	}
	return out;
}

function serializeNodeValue(node: StructureNode, value: unknown): unknown {
	const descriptor = getBlockDescriptor(node.kind);
	if (descriptor?.serialize) {
		const options = {
			...(descriptor.defaultOptions as Bag | undefined),
			...(node.options as Bag),
		};
		if (options.translatable === true && isBag(value)) {
			return serializeLocaleMap(value, options, descriptor.serialize);
		}
		return descriptor.serialize(value, options);
	}
	const children = structureChildren(node.options as Bag);
	if (children.length === 0) {
		return value;
	}
	if (Array.isArray(value)) {
		return value.map((item) => (isBag(item) ? serializeScope(item, children) : item));
	}
	return isBag(value) ? serializeScope(value, children) : value;
}

function serializeLocaleMap(
	value: Bag,
	options: Bag,
	serialize: (value: unknown, options: unknown) => unknown,
): Bag {
	const out: Bag = {};
	for (const [locale, localeValue] of Object.entries(value)) {
		out[locale] = serialize(localeValue, options);
	}
	return out;
}

function isBag(value: unknown): value is Bag {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
