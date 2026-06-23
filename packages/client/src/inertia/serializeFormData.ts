import { getBlockDescriptor } from "../render/blockRegistry";
import type { StructureNode } from "../structure/types";

type Bag = Record<string, unknown>;

export function serializeFormData(data: Bag, formNode: StructureNode | undefined): Bag {
	if (!formNode) {
		return data;
	}
	return serializeScope(data, childNodes(formNode.options as Bag));
}

function serializeScope(scope: Bag, nodes: StructureNode[]): Bag {
	const out = { ...scope };
	for (const node of nodes) {
		if (!node.name) {
			Object.assign(out, serializeScope(out, childNodes(node.options as Bag)));
			continue;
		}
		if (node.name in out) {
			out[node.name] = serializeNodeValue(node, out[node.name]);
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
	const children = childNodes(node.options as Bag);
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

function childNodes(options: Bag): StructureNode[] {
	return [...nodeList(options.children), ...nodeList(options.fields), ...tabBodies(options.tabs)];
}

function nodeList(value: unknown): StructureNode[] {
	return Array.isArray(value) ? (value as StructureNode[]) : [];
}

function tabBodies(value: unknown): StructureNode[] {
	if (!Array.isArray(value)) {
		return [];
	}
	const out: StructureNode[] = [];
	for (const tab of value) {
		const body = (tab as { body?: StructureNode }).body;
		if (body) {
			out.push(body);
		}
	}
	return out;
}

function isBag(value: unknown): value is Bag {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
