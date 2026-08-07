/**
 * Handles the kinds materialize()'s walk() doesn't dispatch by name: built-in
 * named fields (relation, upload) and third-party registered kinds. Split out
 * of materialize.ts to keep that file under the size cap.
 */
import { getBlockDescriptor } from "../render/blockRegistry";
import type { NodeMeta, StructureNode } from "../structure/types";
import { materializeRelation, materializeUpload } from "./materializeHelpers";

// basePath-bound named fields (relation, upload); null when this node is neither.
export function materializeNamedField(
	node: StructureNode,
	meta: NodeMeta,
	basePath: string,
): StructureNode | null {
	if (!node.name) {
		return null;
	}
	if (node.kind === "relation") {
		return materializeRelation({ ...node, meta }, basePath);
	}
	if (node.kind === "upload") {
		return materializeUpload({ ...node, meta }, basePath);
	}
	return null;
}

/**
 * Lets a third-party kind bind its own page-scoped endpoints, the way built-in
 * kinds are wired in materialize(). Returns the node untouched when nothing is
 * registered.
 */
export function bindRegisteredKind(node: StructureNode, basePath: string): StructureNode {
	const registered = getBlockDescriptor(node.kind)?.materialize;
	if (!registered) {
		return node;
	}
	return registered(node, basePath);
}
