import type { StructureNode } from "../structure/structure";

type Item = Record<string, unknown>;

export function emptyItem(subFields: StructureNode[]): Item {
	const item: Item = {};
	for (const node of subFields) {
		if (node.name) {
			item[node.name] = null;
		}
	}
	return item;
}

export function addItem(items: Item[], subFields: StructureNode[]): Item[] {
	return [...items, emptyItem(subFields)];
}

export function removeItem(items: Item[], index: number): Item[] {
	return items.filter((_, i) => i !== index);
}

export function moveItem(items: Item[], index: number, direction: "up" | "down"): Item[] {
	const target = direction === "up" ? index - 1 : index + 1;
	if (target < 0 || target >= items.length) {
		return items;
	}
	const a = items[index];
	const b = items[target];
	if (a === undefined || b === undefined) {
		return items;
	}
	const copy = [...items];
	copy[index] = b;
	copy[target] = a;
	return copy;
}

export function removeAt<T>(arr: T[], index: number): T[] {
	return arr.filter((_, i) => i !== index);
}

export function swapAt<T>(arr: T[], a: number, b: number): T[] {
	if (a < 0 || b < 0 || a >= arr.length || b >= arr.length) {
		return arr;
	}
	const va = arr[a];
	const vb = arr[b];
	if (va === undefined || vb === undefined) {
		return arr;
	}
	const copy = [...arr];
	copy[a] = vb;
	copy[b] = va;
	return copy;
}
